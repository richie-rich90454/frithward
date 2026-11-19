import { describe, expect, it, vi } from "vitest";
import { MediaTranscoder, type TranscoderAdapter } from "./MediaTranscoder.js";

function bytes(...values: number[]): ArrayBuffer {
    return new Uint8Array(values).buffer;
}

describe("MediaTranscoder", () => {
    it("delegates to an injected adapter and returns its output", async () => {
        const output = bytes(1, 2, 3);
        const adapter: TranscoderAdapter = { transcode: vi.fn().mockResolvedValue(output) };
        const transcoder = new MediaTranscoder(adapter);

        const result = await transcoder.convert(bytes(9), "mp4");

        expect(result).toBe(output);
        expect(adapter.transcode).toHaveBeenCalledWith(expect.any(ArrayBuffer), "mp4");
    });

    it("rejects an unsupported output format with EXTERNAL_UNAVAILABLE", async () => {
        const transcoder = new MediaTranscoder();

        await expect(transcoder.convert(bytes(1), "webm")).rejects.toMatchObject({
            code: "EXTERNAL_UNAVAILABLE",
        });
    });

    it("fails explicitly when no adapter is available", async () => {
        const transcoder = new MediaTranscoder(null);

        await expect(transcoder.convert(bytes(1), "mp4")).rejects.toMatchObject({
            code: "EXTERNAL_UNAVAILABLE",
        });
    });

    it("rejects an empty format", async () => {
        const transcoder = new MediaTranscoder();

        await expect(transcoder.convert(bytes(1), "  ")).rejects.toThrow("Format required.");
    });
});
