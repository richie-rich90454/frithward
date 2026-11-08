import { describe, expect, it } from "vitest";
import { GarageObjectStorage } from "../modules/storage/GarageObjectStorage.js";
import { AnalyzeJobHandler } from "../jobs/AnalyzeJobHandler.js";

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
        await expect(handler.handle({ jobId: "j1", payload: { text: "hello" } })).resolves.toBeUndefined();
    });

    it("rejects empty payloads", async () => {
        const handler = new AnalyzeJobHandler();
        await expect(handler.handle({ jobId: "j1", payload: {} })).rejects.toThrow();
    });
});
