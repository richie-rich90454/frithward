import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { GarageObjectStorage } from "./modules/storage/GarageObjectStorage.js";
import { AnalyzeJobHandler } from "./jobs/AnalyzeJobHandler.js";
import { InMemoryJobStatusStore } from "./jobs/jobStore.js";
import { ScamAnalysisRoutes } from "./modules/scam-analysis/presentation/http/ScamAnalysisRoutes.js";
import { PrivacyRoutes } from "./modules/privacy/PrivacyRoutes.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";

type RouteApp = Parameters<Hono["route"]>[1];

function withErrorHandler(routes: RouteApp): Hono {
    const app = new Hono();
    app.onError(errorHandler);
    app.route("/", routes);
    return app;
}

const postJson = (body: unknown, headers: Record<string, string> = {}) =>
    ({
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    }) as const;

describe("GarageObjectStorage", () => {
    it("builds object urls", () => {
        const storage = new GarageObjectStorage("http://garage:3900");
        expect(storage.objectUrl("media", "a.bin")).toBe("http://garage:3900/media/a.bin");
    });

    it("rejects empty keys", () => {
        const storage = new GarageObjectStorage("http://garage:3900");
        expect(() => storage.objectUrl("media", "")).toThrow();
    });
});

describe("AnalyzeJobHandler", () => {
    it("accepts text payloads", async () => {
        const handler = new AnalyzeJobHandler();
        const analysis = await handler.handle({ jobId: "j1", payload: { text: "hello" } });
        expect(analysis.indicators).toEqual([]);
    });

    it("rejects empty payloads", async () => {
        const handler = new AnalyzeJobHandler();
        await expect(handler.handle({ jobId: "j1", payload: {} })).rejects.toThrow();
    });
});

describe("ScamAnalysisRoutes (local-first)", () => {
    it("returns the full synchronous analysis without a queue", async () => {
        const routes = new ScamAnalysisRoutes(null, new InMemoryJobStatusStore());
        const response = await routes.request(
            "/api/scam/message",
            postJson({ text: "URGENT verify your account and pay now" }),
        );
        expect(response.status).toBe(200);
        const body = (await response.json()) as {
            id: string;
            channel: string;
            indicators: unknown[];
            summary: string;
            nextSteps: string[];
            limitations: string[];
            createdAt: string;
        };
        expect(body.id).toBeTypeOf("string");
        expect(body.channel).toBe("message");
        expect(body.indicators.length).toBeGreaterThan(0);
        expect(body.summary).toBeTypeOf("string");
        expect(body.nextSteps.length).toBeGreaterThan(0);
        expect(body.limitations.length).toBeGreaterThan(0);
        expect(body.createdAt).toBeTypeOf("string");
    });

    it("falls back to synchronous analysis when enqueue fails", async () => {
        const queue = {
            enqueueAnalysis: async (): Promise<{ jobId: string }> => {
                throw new Error("no database");
            },
        };
        const routes = new ScamAnalysisRoutes(queue, new InMemoryJobStatusStore());
        const response = await routes.request("/api/scam/message", postJson({ text: "pay now" }));
        expect(response.status).toBe(200);
        expect(((await response.json()) as { summary: string }).summary).toBeTypeOf("string");
    });

    it("maps malformed JSON to 400", async () => {
        const routes = withErrorHandler(new ScamAnalysisRoutes(null, new InMemoryJobStatusStore()));
        const response = await routes.request("/api/scam/message", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{not json",
        });
        expect(response.status).toBe(400);
    });

    it("enqueues and records queued status when a queue succeeds", async () => {
        const store = new InMemoryJobStatusStore();
        const queue = { enqueueAnalysis: async () => ({ jobId: "j-1" }) };
        const routes = new ScamAnalysisRoutes(queue, store);
        const response = await routes.request("/api/scam/message", postJson({ text: "pay now" }));
        expect(response.status).toBe(202);
        expect((await store.get("j-1"))?.status).toBe("queued");
    });
});

describe("job status transitions", () => {
    it("moves queued -> running -> completed with the result", async () => {
        const store = new InMemoryJobStatusStore();
        await store.record("j1", "queued");
        await new AnalyzeJobHandler(undefined, store).handle({
            jobId: "j1",
            payload: { text: "hello" },
        });
        const record = await store.get("j1");
        expect(record?.status).toBe("completed");
        expect(record?.result).toBeDefined();
        expect(record?.error).toBeNull();
    });

    it("moves to failed when the payload is invalid", async () => {
        const store = new InMemoryJobStatusStore();
        await store.record("j2", "queued");
        await expect(
            new AnalyzeJobHandler(undefined, store).handle({ jobId: "j2", payload: {} }),
        ).rejects.toThrow();
        expect((await store.get("j2"))?.status).toBe("failed");
        expect((await store.get("j2"))?.error).toBeTypeOf("string");
    });

    it("persists every transition through a stubbed store", async () => {
        const transitions: string[] = [];
        const store = {
            async record(_id: string, status: string) {
                transitions.push(`record:${status}`);
            },
            async complete(_id: string, _result: unknown) {
                transitions.push("complete");
            },
            async fail(_id: string, _error: string) {
                transitions.push("fail");
            },
            async get() {
                return null;
            },
        };
        await new AnalyzeJobHandler(undefined, store).handle({
            jobId: "j3",
            payload: { text: "pay now" },
        });
        expect(transitions).toEqual(["record:running", "complete"]);
    });
});

describe("PrivacyRoutes", () => {
    it("marks validated empty findings safe", async () => {
        const routes = new PrivacyRoutes();
        const response = await routes.request("/api/privacy/inspect", postJson({ findings: [] }));
        expect(response.status).toBe(200);
        const body = (await response.json()) as { safe: boolean; remediation: string[] };
        expect(body.safe).toBe(true);
        expect(body.remediation).toEqual([]);
    });

    it("marks non-empty findings unsafe after validation", async () => {
        const routes = new PrivacyRoutes();
        const response = await routes.request(
            "/api/privacy/inspect",
            postJson({
                findings: [
                    {
                        id: "f1",
                        kind: "pii-email",
                        detail: "email in metadata",
                        remediation: "strip email",
                    },
                ],
            }),
        );
        expect(response.status).toBe(200);
        const body = (await response.json()) as { safe: boolean; remediation: string[] };
        expect(body.safe).toBe(false);
        expect(body.remediation).toEqual(["strip email"]);
    });

    it("rejects blocked location metadata rather than marking it safe", async () => {
        const routes = withErrorHandler(new PrivacyRoutes());
        const response = await routes.request(
            "/api/privacy/inspect",
            postJson({
                findings: [
                    {
                        id: "f1",
                        kind: "exif-gps",
                        detail: "gps coordinates",
                        remediation: "remove gps",
                    },
                ],
            }),
        );
        expect(response.status).toBe(400);
    });
});

describe("rate limiter", () => {
    it("returns 429 after the configured limit per IP", async () => {
        const app = new Hono();
        app.use("*", createRateLimiter({ windowMs: 60_000, limit: 2 }));
        app.post("/x", (context) => context.text("ok"));
        const request = () =>
            app.request("/x", {
                method: "POST",
                headers: { "x-forwarded-for": "1.2.3.4" },
            });
        expect((await request()).status).toBe(200);
        expect((await request()).status).toBe(200);
        expect((await request()).status).toBe(429);
    });
});
