import { FaceProtectionAdapter, VoiceProtectionAdapter } from "@frithward/media-core";
import {
    FaceProtectionPolicy,
    ProtectFaceUseCase,
    ProtectVoiceUseCase,
    ProtectedMediaExporter,
    VoiceProtectionPolicy,
    type FaceProtectionPort,
    type ProtectionResult,
    type ProtectedMediaExport,
    type VoiceProtectionPort,
} from "../../infrastructure/mediaAnalysisBridge.js";

export interface ProtectionResultView {
    assetId: string;
    status: ProtectionResult["status"];
    method: string;
    artifactId: string | null;
    summary: string;
    limitations: readonly string[];
    nextSteps: readonly string[];
    experimental: boolean;
}

export interface ProtectedExportView {
    assetId: string;
    manifest: string;
    limitations: readonly string[];
}

export interface MediaProtectionControllerOptions {
    voicePort?: VoiceProtectionPort;
    facePort?: FaceProtectionPort;
    exporter?: Pick<ProtectedMediaExporter, "export">;
}

interface ProtectionInput {
    assetId: string;
    consentDocumented: boolean;
    byteSize: number;
}

function toView(result: ProtectionResult): ProtectionResultView {
    return {
        assetId: result.assetId,
        status: result.status,
        method: result.method,
        artifactId: result.artifactId,
        summary: result.summary,
        limitations: [...result.limitations],
        nextSteps: [...result.nextSteps],
        experimental: result.experimental,
    };
}

function toExportView(result: ProtectedMediaExport): ProtectedExportView {
    return {
        assetId: result.assetId,
        manifest: result.manifest,
        limitations: [...result.limitations],
    };
}

export class MediaProtectionController {
    private readonly voicePort: VoiceProtectionPort;
    private readonly facePort: FaceProtectionPort;
    private readonly exporter: Pick<ProtectedMediaExporter, "export">;
    private readonly voiceUseCase: ProtectVoiceUseCase;
    private readonly faceUseCase: ProtectFaceUseCase;
    private readonly listeners = new Set<() => void>();
    private voiceResult: ProtectionResultView | null = null;
    private faceResult: ProtectionResultView | null = null;
    private exportView: ProtectedExportView | null = null;
    private error: string | null = null;

    public constructor(options: MediaProtectionControllerOptions = {}) {
        const voiceAdapter = new VoiceProtectionAdapter("browser-local");
        const faceAdapter = new FaceProtectionAdapter("browser-local");
        this.voicePort = options.voicePort ?? {
            protect: async (input) => ({ ...(await voiceAdapter.protect(input)), models: [] }),
        };
        this.facePort = options.facePort ?? {
            protect: async (input) => ({ ...(await faceAdapter.protect(input)), models: [] }),
        };
        this.exporter = options.exporter ?? new ProtectedMediaExporter();
        // Experimental opt-in is explicit; documented consent is still enforced by each use case.
        this.voiceUseCase = new ProtectVoiceUseCase(
            this.voicePort,
            new VoiceProtectionPolicy({
                allowExperimentalProtection: true,
            }),
        );
        this.faceUseCase = new ProtectFaceUseCase(
            this.facePort,
            new FaceProtectionPolicy({
                allowExperimentalProtection: true,
            }),
        );
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getVoiceResult(): ProtectionResultView | null {
        return this.voiceResult;
    }

    public getFaceResult(): ProtectionResultView | null {
        return this.faceResult;
    }

    public getExportView(): ProtectedExportView | null {
        return this.exportView;
    }

    public getError(): string | null {
        return this.error;
    }

    public async protectVoice(input: ProtectionInput & { audio: ArrayBuffer }): Promise<void> {
        this.voiceResult = null;
        this.exportView = null;
        try {
            const result = await this.voiceUseCase.execute({
                assetId: input.assetId,
                audio: input.audio,
                consentDocumented: input.consentDocumented,
                signal: new AbortController().signal,
            });
            this.voiceResult = toView(result);
            this.recordExport(input, result);
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Voice protection failed.";
        }
        this.notify();
    }

    public async protectFace(
        input: ProtectionInput & { image: ArrayBuffer; faceSizePx?: number | undefined },
    ): Promise<void> {
        this.faceResult = null;
        this.exportView = null;
        try {
            const result = await this.faceUseCase.execute({
                assetId: input.assetId,
                image: input.image,
                consentDocumented: input.consentDocumented,
                ...(input.faceSizePx === undefined ? {} : { faceSizePx: input.faceSizePx }),
                signal: new AbortController().signal,
            });
            this.faceResult = toView(result);
            this.recordExport(input, result);
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Face protection failed.";
        }
        this.notify();
    }

    private recordExport(input: ProtectionInput, result: ProtectionResult): void {
        if (result.status !== "applied" || !result.artifactId) return;
        this.exportView = toExportView(
            this.exporter.export({
                assetId: input.assetId,
                artifacts: [
                    {
                        id: result.artifactId,
                        byteSize: input.byteSize,
                        method: result.method,
                    },
                ],
            }),
        );
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
