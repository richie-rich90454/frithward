import { AppError } from "@frithward/contracts";

export interface ProtectedMediaArtifact {
    readonly id: string;
    readonly byteSize: number;
    readonly method: string;
}

export interface ProtectedMediaExport {
    readonly assetId: string;
    readonly artifacts: readonly ProtectedMediaArtifact[];
    readonly manifest: string;
    readonly limitations: readonly string[];
}

const PROTECTION_LIMITS: readonly string[] = Object.freeze([
    "Protection is experimental and does not guarantee prevention of misuse.",
    "Artifact hashes must be verified separately before distribution.",
]);

export class ProtectedMediaExporter {
    public export(input: {
        assetId: string;
        artifacts: readonly ProtectedMediaArtifact[];
    }): ProtectedMediaExport {
        if (input.assetId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset id required.");
        if (input.artifacts.length === 0)
            throw new AppError("VALIDATION_FAILED", "At least one protected artifact is required.");
        for (const artifact of input.artifacts) {
            if (artifact.id.trim().length === 0)
                throw new AppError("VALIDATION_FAILED", "Artifact id required.");
            if (artifact.method.trim().length === 0)
                throw new AppError("VALIDATION_FAILED", "Artifact method required.");
            if (!Number.isInteger(artifact.byteSize) || artifact.byteSize < 0) {
                throw new AppError(
                    "VALIDATION_FAILED",
                    "Artifact size must be a non-negative integer.",
                );
            }
        }
        const manifest = JSON.stringify(
            {
                assetId: input.assetId,
                experimental: true,
                artifacts: input.artifacts.map((artifact) => ({
                    id: artifact.id,
                    byteSize: artifact.byteSize,
                    method: artifact.method,
                })),
                limitations: PROTECTION_LIMITS,
            },
            null,
            2,
        );
        return {
            assetId: input.assetId,
            artifacts: input.artifacts.map((artifact) => ({ ...artifact })),
            manifest,
            limitations: PROTECTION_LIMITS,
        };
    }
}
