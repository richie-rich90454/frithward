import { describe, expect, it } from "vitest";
import { PCM_TARGET_RATE, downsampleToPcm16, interleaveChannels } from "./pcm-downsample.js";

const fakeWorkletGlobalScope = { sampleRate: 48_000, currentFrame: 0 };

describe("downsampleToPcm16", () => {
    it("resamples from a fake worklet scope sample rate to 16kHz", () => {
        const pcm = downsampleToPcm16(
            new Float32Array(fakeWorkletGlobalScope.sampleRate),
            fakeWorkletGlobalScope.sampleRate,
        );
        expect(PCM_TARGET_RATE).toBe(16_000);
        expect(pcm.length).toBe(16_000);
    });

    it("maps full-scale samples to signed 16-bit limits", () => {
        const pcm = downsampleToPcm16(new Float32Array([1, 1, -1, -1]), 16_000);
        expect(Array.from(pcm)).toEqual([32_767, 32_767, -32_768, -32_768]);
    });

    it("clamps out-of-range input", () => {
        const pcm = downsampleToPcm16(new Float32Array([4, -4]), 16_000);
        expect(Array.from(pcm)).toEqual([32_767, -32_768]);
    });

    it("mixes interleaved channels down to mono", () => {
        const pcm = downsampleToPcm16(
            interleaveChannels([new Float32Array([1, 1]), new Float32Array([-1, -1])]),
            16_000,
            2,
        );
        expect(Array.from(pcm)).toEqual([0, 0]);
    });

    it("rejects invalid rates", () => {
        expect(() => downsampleToPcm16(new Float32Array(1), 0)).toThrow(RangeError);
    });
});
