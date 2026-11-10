import { AppError } from "@frithward/contracts";

export interface VoiceProtectionOutcome {
    readonly artifactId: string;
    readonly method: string;
    readonly experimental: boolean;
    readonly limitations: readonly string[];
}

const VOICE_PROTECTION_LIMITS: readonly string[] = Object.freeze([
    "Voice protection is experimental and has not been independently evaluated.",
    "Protection does not guarantee prevention of misuse or impersonation.",
    "Effectiveness varies by language, recording quality, and attack method.",
    "Documented consent from the speaker is required before applying protection.",
]);

export class VoiceProtectionAdapter {
    private readonly enginePath: string;
    private disposed = false;

    public constructor(enginePath: string) {
        if (enginePath.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Voice protection engine path required.");
        this.enginePath = enginePath;
    }

    public async protect(input: {
        assetId: string;
        audio: ArrayBuffer;
        signal: AbortSignal;
    }): Promise<VoiceProtectionOutcome> {
        this.assertActive();
        if (input.assetId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset id required.");
        if (input.audio.byteLength === 0)
            throw new AppError("VALIDATION_FAILED", "Audio payload required.");
        if (input.signal.aborted) throw new AppError("CANCELLED", "Voice protection cancelled.");
        // shortcut: experimental skeleton; replace with the inference bridge before use.
        throw new AppError(
            "EXTERNAL_UNAVAILABLE",
            `Voice protection engine at ${this.enginePath} is experimental and not available in this build.`,
        );
    }

    public describeLimits(): readonly string[] {
        return VOICE_PROTECTION_LIMITS;
    }

    public dispose(): void {
        this.disposed = true;
    }

    private assertActive(): void {
        if (this.disposed) {
            throw new AppError("CANCELLED", "Voice protection adapter is disposed.");
        }
    }
}
