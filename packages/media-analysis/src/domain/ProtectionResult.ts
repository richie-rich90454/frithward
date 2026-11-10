import { AppError } from "@frithward/contracts";
import type { ModelEntry } from "@frithward/model-registry";

export type ProtectionStatus = "applied" | "unavailable";

export class ProtectionResult {
    public readonly assetId: string;
    public readonly status: ProtectionStatus;
    public readonly method: string;
    public readonly artifactId: string | null;
    public readonly limitations: readonly string[];
    public readonly models: readonly ModelEntry[];
    public readonly nextSteps: readonly string[];
    public readonly summary: string;
    public readonly experimental: boolean;

    public constructor(input: {
        assetId: string;
        status: ProtectionStatus;
        method: string;
        artifactId?: string | null;
        limitations?: readonly string[];
        models?: readonly ModelEntry[];
        nextSteps?: readonly string[];
        experimental?: boolean;
    }) {
        if (input.assetId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset id required.");
        if (input.method.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Protection method required.");
        this.assetId = input.assetId;
        this.status = input.status;
        this.method = input.method;
        this.artifactId = input.artifactId ?? null;
        this.limitations = input.limitations ?? [
            "Protection is experimental and does not guarantee prevention of misuse.",
        ];
        this.models = input.models ?? [];
        this.nextSteps = input.nextSteps ?? [
            "Keep the original and protected artifacts together.",
            "Re-evaluate protection after any model or policy update.",
        ];
        this.experimental = input.experimental ?? true;
        this.summary =
            this.status === "applied"
                ? `Protection applied on an experimental basis using ${input.method}. This does not guarantee prevention of misuse.`
                : "Protection is unavailable for this asset. This does not establish that the media is safe to publish.";
    }
}
