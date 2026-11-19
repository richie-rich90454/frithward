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
});
