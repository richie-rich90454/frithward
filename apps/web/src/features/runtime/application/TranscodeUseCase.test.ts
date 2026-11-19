import { describe, expect, it } from "vitest";
import type { TranscodeRequest, TranscodeResult, TranscoderPort } from "../ports/TranscoderPort";
import { TranscodeUseCase } from "./TranscodeUseCase";

const result: TranscodeResult = {
    kind: "video",
    codec: "vp8",
    encodedChunks: 2,
    decodedChunks: 2,
    encodedBytes: 64,
};

class FakeTranscoder implements TranscoderPort {
    public received: TranscodeRequest | null = null;

    public async transcode(request: TranscodeRequest): Promise<TranscodeResult> {
        this.received = request;
        return result;
    }
}

function request(overrides: Partial<TranscodeRequest> = {}): TranscodeRequest {
    return {
        config: {
            kind: "video",
            codec: "vp8",
            width: 8,
            height: 8,
            bitrate: 1000,
            framerate: 30,
        },
        chunks: [{ data: new ArrayBuffer(8), timestampUs: 0, durationUs: 0, keyFrame: true }],
        signal: new AbortController().signal,
        ...overrides,
    };
}

describe("TranscodeUseCase", () => {
    it("validates the request and delegates to the transcoder port", async () => {
        const transcoder = new FakeTranscoder();
        const useCase = new TranscodeUseCase(transcoder);
        const input = request();

        expect(await useCase.execute(input)).toEqual(result);
        expect(transcoder.received).toBe(input);
    });

    it("rejects an already-aborted signal", async () => {
        const controller = new AbortController();
        controller.abort();
        const transcoder = new FakeTranscoder();
        await expect(
            new TranscodeUseCase(transcoder).execute(request({ signal: controller.signal })),
        ).rejects.toThrow("aborted");
        expect(transcoder.received).toBeNull();
    });

    it("rejects empty chunk lists", async () => {
        await expect(
            new TranscodeUseCase(new FakeTranscoder()).execute(request({ chunks: [] })),
        ).rejects.toThrow("No media chunks");
    });

    it("rejects a non-positive bitrate", async () => {
        await expect(
            new TranscodeUseCase(new FakeTranscoder()).execute(
                request({
                    config: {
                        kind: "audio",
                        codec: "opus",
                        sampleRate: 48000,
                        numberOfChannels: 1,
                        bitrate: 0,
                    },
                }),
            ),
        ).rejects.toThrow("Bitrate must be positive");
    });

    it("propagates port failures", async () => {
        const failing: TranscoderPort = {
            transcode: async () => {
                throw new Error("Codec unsupported.");
            },
        };
        await expect(new TranscodeUseCase(failing).execute(request())).rejects.toThrow(
            "Codec unsupported.",
        );
    });
});
