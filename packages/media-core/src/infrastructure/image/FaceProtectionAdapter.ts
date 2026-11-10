import { AppError } from "@frithward/contracts";

export interface FaceProtectionOutcome {
    readonly artifactId: string;
    readonly method: string;
    readonly experimental: boolean;
    readonly limitations: readonly string[];
}

const FACE_PROTECTION_LIMITS: readonly string[] = Object.freeze([
    "Face protection is experimental and has not been independently evaluated.",
    "Protection does not guarantee prevention of misuse.",
    "Performance varies across demographic groups and must be evaluated before deployment.",
    "Documented consent from the person depicted is required before applying protection.",
]);

export class FaceProtectionAdapter {
    private readonly enginePath: string;
    private disposed = false;

    public constructor(enginePath: string) {
        if (enginePath.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Face protection engine path required.");
        this.enginePath = enginePath;
    }

    public async protect(input: {
        assetId: string;
        image: ArrayBuffer;
        signal: AbortSignal;
    }): Promise<FaceProtectionOutcome> {
        this.assertActive();
        if (input.assetId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset id required.");
        if (input.image.byteLength === 0)
            throw new AppError("VALIDATION_FAILED", "Image payload required.");
        if (input.signal.aborted) throw new AppError("CANCELLED", "Face protection cancelled.");
        // shortcut: experimental skeleton; replace with the inference bridge before use.
        throw new AppError(
            "EXTERNAL_UNAVAILABLE",
            `Face protection engine at ${this.enginePath} is experimental and not available in this build.`,
        );
    }

    public describeLimits(): readonly string[] {
        return FACE_PROTECTION_LIMITS;
    }

    public dispose(): void {
        this.disposed = true;
    }

    private assertActive(): void {
        if (this.disposed) {
            throw new AppError("CANCELLED", "Face protection adapter is disposed.");
        }
    }
}
