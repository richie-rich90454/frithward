import { describe, expect, it, vi } from "vitest";
import type { TranscoderPort, TranscodeRequest } from "../../../runtime/ports/TranscoderPort.js";
import { ImageRedactor } from "../../application/ImageRedactor.js";
import { MediaWorkshopController } from "./MediaWorkshopController";

const fileOf = (bytes: ArrayBuffer): File =>
    ({ arrayBuffer: async () => bytes }) as unknown as File;

const decoded = {
    sampleRate: 48000,
    numberOfChannels: 1,
    duration: 0.5,
    channels: [new Float32Array([0, 0.5, 0, 0])],
};

const fakeTranscoder: TranscoderPort = {
    transcode: vi.fn().mockResolvedValue({
        kind: "audio",
        codec: "mp4a.40.2",
        encodedChunks: 1,
        decodedChunks: 1,
        encodedBytes: 120,
    }),
};

describe("MediaWorkshopController media processing", () => {
    it("decodes a selected audio file and transcodes it through the WebCodecs port", async () => {
        let request: TranscodeRequest | null = null;
        const transcoder: TranscoderPort = {
            transcode: vi.fn().mockImplementation(async (value: TranscodeRequest) => {
                request = value;
                return {
                    kind: "audio",
                    codec: "mp4a.40.2",
                    encodedChunks: 1,
                    decodedChunks: 1,
                    encodedBytes: 120,
                };
            }),
        };
        const controller = new MediaWorkshopController({
            transcoder,
            decodeAudio: vi.fn().mockResolvedValue(decoded),
        });

        await controller.transcodeAudio(fileOf(new ArrayBuffer(8)));

        expect(request).toMatchObject({
            config: { kind: "audio", codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 1 },
            chunks: [{ timestampUs: 0, durationUs: 500000 }],
        });
        expect(controller.getTranscodeStatus()).toContain("Transcoded 1 chunk(s)");
        expect(controller.getError()).toBeNull();
    });

    it("redacts a region and exposes a preview without touching image libraries in the view", async () => {
        const redactor = {
            redact: vi.fn().mockResolvedValue(new Blob(["png"])),
        } as unknown as ImageRedactor;
        const controller = new MediaWorkshopController({ redactor });

        await controller.redactImage({
            file: fileOf(new ArrayBuffer(4)),
            x: "10",
            y: "20",
            width: "30",
            height: "40",
        });

        expect(redactor.redact).toHaveBeenCalledWith(expect.any(ArrayBuffer), {
            x: 10,
            y: 20,
            width: 30,
            height: 40,
        });
        expect(controller.getPreviewUrl()).toMatch(/^blob:/);
        expect(controller.getRedactionStatus()).toBe("Redacted image ready.");
        controller.dispose();
    });

    it("reports unsupported decoding honestly", async () => {
        const controller = new MediaWorkshopController({
            decodeAudio: vi.fn().mockRejectedValue(new Error("AudioContext is unavailable")),
        });

        await controller.transcodeAudio(fileOf(new ArrayBuffer(4)));

        expect(controller.getError()).toBe("AudioContext is unavailable");
        expect(controller.getTranscodeStatus()).toBeNull();
    });

    it("returns a 256-bucket amplitude envelope from decoded channels, or null without audio", async () => {
        const controller = new MediaWorkshopController({
            transcoder: fakeTranscoder,
            decodeAudio: vi.fn().mockResolvedValue(decoded),
        });
        expect(controller.getWaveformData()).toBeNull();

        await controller.transcodeAudio(fileOf(new ArrayBuffer(8)));
        const envelope = controller.getWaveformData();
        if (!envelope) throw new Error("Expected a waveform envelope.");
        expect(envelope).toHaveLength(256);
        expect(envelope[0]).toBe(0);
        expect(envelope[64]).toBeCloseTo(0.5, 6);
        expect(envelope[128]).toBe(0);
        expect(envelope[192]).toBe(0);

        const right = new Float32Array(256).fill(0.25);
        right[200] = 0.8;
        const stereo = new MediaWorkshopController({
            transcoder: fakeTranscoder,
            decodeAudio: vi.fn().mockResolvedValue({
                sampleRate: 44100,
                numberOfChannels: 2,
                duration: 1,
                channels: [new Float32Array(256).fill(0.1), right],
            }),
        });
        await stereo.transcodeAudio(fileOf(new ArrayBuffer(8)));
        const mixed = stereo.getWaveformData();
        if (!mixed) throw new Error("Expected a stereo waveform envelope.");
        expect(mixed[0]).toBeCloseTo(0.25, 6);
        expect(mixed[200]).toBeCloseTo(0.8, 6);
    });

    it("exposes a real, non-empty transcoded audio blob only after transcoding succeeds", async () => {
        const controller = new MediaWorkshopController({
            transcoder: fakeTranscoder,
            decodeAudio: vi.fn().mockResolvedValue(decoded),
        });
        expect(controller.getTranscodedAudio()).toBeNull();

        await controller.transcodeAudio(fileOf(new ArrayBuffer(8)));
        const artifact = controller.getTranscodedAudio();
        if (!artifact) throw new Error("Expected a transcoded audio artifact.");
        expect(artifact.fileName).toBe("transcoded-audio.wav");
        expect(artifact.blob.type).toBe("audio/wav");
        expect(artifact.blob.size).toBeGreaterThan(44);
        const header = new Uint8Array(await artifact.blob.arrayBuffer()).subarray(0, 4);
        expect(String.fromCharCode(...header)).toBe("RIFF");

        const failing = new MediaWorkshopController({
            decodeAudio: vi.fn().mockRejectedValue(new Error("no decode")),
        });
        await failing.transcodeAudio(fileOf(new ArrayBuffer(4)));
        expect(failing.getTranscodedAudio()).toBeNull();
        expect(failing.getWaveformData()).toBeNull();
    });

    it("exposes the existing redaction blob only after redaction succeeds", async () => {
        const blob = new Blob(["png-bytes"], { type: "image/png" });
        const redactor = { redact: vi.fn().mockResolvedValue(blob) } as unknown as ImageRedactor;
        const controller = new MediaWorkshopController({ redactor });
        expect(controller.getRedactedImage()).toBeNull();

        await controller.redactImage({
            file: fileOf(new ArrayBuffer(4)),
            x: "0",
            y: "0",
            width: "2",
            height: "2",
        });
        const artifact = controller.getRedactedImage();
        if (!artifact) throw new Error("Expected a redacted image artifact.");
        expect(artifact.fileName).toBe("redacted-image.png");
        expect(artifact.blob).toBe(blob);
        expect(artifact.blob.size).toBeGreaterThan(0);
        controller.dispose();
    });
});
