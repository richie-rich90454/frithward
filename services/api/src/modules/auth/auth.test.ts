import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errorHandler.js";
import { createAuth } from "./auth.js";
import { createAuthModule } from "./composition/createAuthModule.js";
import { AuthRoutes } from "./presentation/AuthRoutes.js";

describe("createAuthModule", () => {
    it("returns no Better Auth instance without a database URL", () => {
        const module = createAuthModule(undefined);
        expect(module.auth).toBeNull();
    });

    it("returns a real Better Auth instance when a database URL is configured", () => {
        const module = createAuthModule("postgres://user:pass@localhost:5432/frithward");
        expect(module.auth).not.toBeNull();
        expect(typeof module.auth?.handler).toBe("function");
    });

    it("keeps the session route ahead of the Better Auth wildcard", async () => {
        const app = new Hono();
        app.onError(errorHandler);
        app.route("/", new AuthRoutes({ getSession: async () => null }));
        app.all("/api/auth/*", () => new Response("better-auth"));
        const response = await app.request("/api/auth/session");
        expect(response.status).toBe(200);
        expect(((await response.json()) as { authenticated: boolean }).authenticated).toBe(false);
    });

    it("reports the auth backend as unavailable without a database", async () => {
        const app = new Hono();
        app.onError(errorHandler);
        app.route("/", createAuthModule(undefined).routes);
        const response = await app.request("/api/auth/session");
        expect(response.status).toBe(503);
    });
});

describe("createAuth secret resolution", () => {
    afterEach(() => vi.unstubAllEnvs());

    const url = "postgres://user:pass@localhost:5432/frithward";

    it("requires a secret in production", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("BETTER_AUTH_SECRET", "");
        expect(() => createAuthModule(url)).toThrow(
            "BETTER_AUTH_SECRET must be set in production.",
        );
    });

    it("honors a configured secret in production", () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("BETTER_AUTH_SECRET", "configured-secret");
        expect(createAuthModule(url).auth).not.toBeNull();
    });

    it("uses an ephemeral secret outside production", () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("BETTER_AUTH_SECRET", "");
        expect(createAuthModule(url).auth).not.toBeNull();
    });

    it("rejects an empty database URL", () => {
        expect(() => createAuth("")).toThrow("Database URL is required for authentication.");
    });
});
