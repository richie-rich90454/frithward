import { describe, expect, it, vi } from "vitest";
import { MediaProtectionController } from "./MediaProtectionController";
import type {
    FaceProtectionPort,
    VoiceProtectionPort,
} from "../../infrastructure/mediaAnalysisBridge.js";

function bufferOf(text: string): ArrayBuffer {
    const bytes = new TextEncoder().encode(text);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

function voicePort() {
    return {
        protect: vi.fn(async () => ({
            artifactId: "voice-artifact",
            method: "experimental-voice",
            limitations: ["not independently evaluated"],
            models: [],
        })),
    } satisfies VoiceProtectionPort;
}

function facePort() {
    return {
        protect: vi.fn(async () => ({
            artifactId: "face-artifact",
            method: "experimental-face",
            limitations: ["not independently evaluated"],
            models: [],
        })),
    } satisfies FaceProtectionPort;
}

describe("MediaProtectionController", () => {
    it("requires documented consent before calling the voice port", async () => {
        const port = voicePort();
        const controller = new MediaProtectionController({ voicePort: port });
        await controller.protectVoice({
            assetId: "clip-1",
            audio: bufferOf("audio"),
            byteSize: 5,
            consentDocumented: false,
        });
        expect(port.protect).not.toHaveBeenCalled();
        expect(controller.getVoiceResult()).toBeNull();
        expect(controller.getError()).toContain("documented consent");
    });

    it("runs the real voice use case and exports the artifact through the exporter", async () => {
        const port = voicePort();
        const exportMock = vi.fn(() => ({
            assetId: "clip-1",
            artifacts: [{ id: "voice-artifact", byteSize: 5, method: "experimental-voice" }],
            manifest: '{"experimental":true}',
            limitations: ["verification required"],
        }));
        const controller = new MediaProtectionController({
            voicePort: port,
            exporter: { export: exportMock },
        });
        await controller.protectVoice({
            assetId: "clip-1",
            audio: bufferOf("audio"),
            byteSize: 5,
            consentDocumented: true,
        });
        expect(port.protect).toHaveBeenCalledOnce();
        expect(exportMock).toHaveBeenCalledWith({
            assetId: "clip-1",
            artifacts: [{ id: "voice-artifact", byteSize: 5, method: "experimental-voice" }],
        });
        expect(controller.getVoiceResult()?.status).toBe("applied");
        expect(controller.getVoiceResult()?.experimental).toBe(true);
        expect(controller.getExportView()?.manifest).toBe('{"experimental":true}');
        expect(controller.getError()).toBeNull();
    });

    it("enforces the minimum face size before touching the face port", async () => {
        const port = facePort();
        const controller = new MediaProtectionController({ facePort: port });
        await controller.protectFace({
            assetId: "photo-1",
            image: bufferOf("image"),
            byteSize: 5,
            consentDocumented: true,
            faceSizePx: 8,
        });
        expect(port.protect).not.toHaveBeenCalled();
        expect(controller.getFaceResult()).toBeNull();
        expect(controller.getError()).toContain("smaller than the minimum");
    });

    it("protects a face with a real use case when consent and size are valid", async () => {
        const port = facePort();
        const controller = new MediaProtectionController({ facePort: port });
        await controller.protectFace({
            assetId: "photo-1",
            image: bufferOf("image"),
            byteSize: 5,
            consentDocumented: true,
            faceSizePx: 128,
        });
        expect(port.protect).toHaveBeenCalledOnce();
        expect(controller.getFaceResult()?.artifactId).toBe("face-artifact");
        expect(controller.getExportView()?.manifest).toContain("face-artifact");
    });
});
