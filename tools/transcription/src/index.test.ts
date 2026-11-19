import { describe, expect, it, vi } from "vitest";
import { TranscriptionTool, type TranscribeRequest } from "./index.js";
import type { RecognizedUtterance, SpeechRecognitionPort } from "@frithward/media-core";

const request: TranscribeRequest = {
    audioId: "audio-1",
    language: "en",
    audio: new ArrayBuffer(8),
};

describe("TranscriptionTool", () => {
    it("reports an honest limitation when no engine is configured", () => {
        const tool = new TranscriptionTool();
        const description = tool.describe(request);
        expect(description).toContain("unavailable");
        expect(description).not.toContain("queued");
    });

    it("fails explicitly when transcribing without an engine", async () => {
        const tool = new TranscriptionTool();
        await expect(tool.transcribe(request)).rejects.toMatchObject({
            code: "EXTERNAL_UNAVAILABLE",
        });
    });

    it("delegates audio to an injected recognition port", async () => {
        const utterances: RecognizedUtterance[] = [
            { startMs: 0, endMs: 1000, text: "Hello", speakerId: null },
        ];
        const recognize = vi.fn().mockResolvedValue(utterances);
        const port: SpeechRecognitionPort = { recognize };
        const tool = new TranscriptionTool(port);

        const result = await tool.transcribe(request);

        expect(result).toBe(utterances);
        expect(recognize).toHaveBeenCalledWith({
            audio: request.audio,
            language: "en",
            signal: expect.any(AbortSignal),
        });
        expect(tool.describe(request)).toContain("available");
    });
});
