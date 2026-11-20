import { afterEach, describe, expect, it, vi } from "vitest";

const { createWorker } = vi.hoisted(() => ({ createWorker: vi.fn() }));

vi.mock("tesseract.js", () => ({ default: { createWorker } }));

import {
    LOCAL_TESSDATA_PATH,
    TesseractOcrAdapter,
    tesseractWorkerOptions,
} from "./TesseractOcrAdapter";

afterEach(() => {
    vi.unstubAllGlobals();
    createWorker.mockReset();
});

describe("TesseractOcrAdapter", () => {
    it("builds same-origin gzip options for language data", () => {
        expect(tesseractWorkerOptions()).toEqual({ langPath: "/tessdata", gzip: true });
        expect(LOCAL_TESSDATA_PATH).toBe("/tessdata");
        expect(tesseractWorkerOptions("/custom")).toEqual({ langPath: "/custom", gzip: true });
    });

    it("passes langPath and gzip to createWorker", async () => {
        vi.stubGlobal("Worker", class {});
        createWorker.mockResolvedValue({
            recognize: vi.fn().mockResolvedValue({ data: { text: "ok", confidence: 90 } }),
            terminate: vi.fn().mockResolvedValue(undefined),
        });

        const adapter = new TesseractOcrAdapter("/tessdata");
        const result = await adapter.recognize({ image: new ArrayBuffer(2), language: "eng" });

        expect(createWorker).toHaveBeenCalledWith("eng", 1, { langPath: "/tessdata", gzip: true });
        expect(result).toEqual({ text: "ok", confidence: 90 });
    });

    it("reports a clear error when local language data is unavailable", async () => {
        vi.stubGlobal("Worker", class {});
        createWorker.mockRejectedValueOnce(new Error("404"));

        const adapter = new TesseractOcrAdapter();

        await expect(
            adapter.recognize({ image: new ArrayBuffer(2), language: "eng" }),
        ).rejects.toThrow(/public\/tessdata/);
    });
});
