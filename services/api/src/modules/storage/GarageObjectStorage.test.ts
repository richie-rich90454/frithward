import { Hono } from "hono";
import type { S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errorHandler.js";
import { GarageObjectStorage } from "./GarageObjectStorage.js";
import { StorageRoutes } from "./StorageRoutes.js";

function fakeClient(send: (command: unknown) => Promise<unknown>): S3Client {
    return { send } as unknown as S3Client;
}

function withErrorHandler(routes: Hono): Hono {
    const app = new Hono();
    app.onError(errorHandler);
    app.route("/", routes);
    return app;
}

describe("GarageObjectStorage S3 adapter", () => {
    it("puts an object with bucket, key and content length", async () => {
        const inputs: unknown[] = [];
        const client = fakeClient(async (command) => {
            inputs.push((command as { input: unknown }).input);
            return {};
        });
        const storage = new GarageObjectStorage("http://garage:3900", { bucket: "media", client });
        await storage.putObject("a.bin", new Uint8Array([1, 2, 3]), "application/octet-stream");
        expect(inputs[0]).toMatchObject({
            Bucket: "media",
            Key: "a.bin",
            ContentLength: 3,
            ContentType: "application/octet-stream",
        });
    });

    it("gets an object body as bytes", async () => {
        const client = fakeClient(async () => ({
            Body: { transformToByteArray: async () => new Uint8Array([9, 8]) },
        }));
        const storage = new GarageObjectStorage("http://garage:3900", { client });
        expect(await storage.getObject("a.bin")).toEqual(new Uint8Array([9, 8]));
    });

    it("returns null for a missing object", async () => {
        const client = fakeClient(async () => {
            throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
        });
        const storage = new GarageObjectStorage("http://garage:3900", { client });
        expect(await storage.getObject("gone.bin")).toBeNull();
    });

    it("deletes an object", async () => {
        const send = vi.fn(async () => ({}));
        const storage = new GarageObjectStorage("http://garage:3900", { client: fakeClient(send) });
        await storage.deleteObject("a.bin");
        expect(send).toHaveBeenCalledTimes(1);
    });

    it("keeps the URL builder and rejects empty keys", () => {
        const storage = new GarageObjectStorage("http://garage:3900/");
        expect(storage.objectUrl("media", "a.bin")).toBe("http://garage:3900/media/a.bin");
        expect(() => storage.objectUrl("media", "")).toThrow();
    });

    it("reports EXTERNAL_UNAVAILABLE without an S3 client", async () => {
        const storage = new GarageObjectStorage("http://garage:3900");
        await expect(storage.putObject("a.bin", new Uint8Array())).rejects.toMatchObject({
            code: "EXTERNAL_UNAVAILABLE",
        });
    });
});

describe("StorageRoutes", () => {
    const storage = {
        putObject: vi.fn(async () => undefined),
        getObject: vi.fn(async () => new Uint8Array([1, 2, 3])),
    } as unknown as GarageObjectStorage;

    it("stores an object and returns 201", async () => {
        const app = withErrorHandler(new StorageRoutes(storage));
        const response = await app.request("/api/storage/a.bin", {
            method: "POST",
            headers: { "content-type": "application/octet-stream" },
            body: new Uint8Array([1, 2, 3]),
        });
        expect(response.status).toBe(201);
        expect(((await response.json()) as { key: string }).key).toBe("a.bin");
    });

    it("serves an object", async () => {
        const app = withErrorHandler(new StorageRoutes(storage));
        const response = await app.request("/api/storage/a.bin");
        expect(response.status).toBe(200);
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("rejects traversal keys with 400", async () => {
        const app = withErrorHandler(new StorageRoutes(storage));
        const response = await app.request("/api/storage/..%2Fsecret");
        expect(response.status).toBe(400);
    });

    it("returns 503 when Garage is not configured", async () => {
        const app = withErrorHandler(new StorageRoutes(null));
        const response = await app.request("/api/storage/a.bin");
        expect(response.status).toBe(503);
    });
});
