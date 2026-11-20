import { AppError } from "@frithward/contracts";
import type { ModelEntry } from "@frithward/model-registry";
import { analysisLimitationCode } from "./AnalysisLimitations.js";

export type ProtectionStatus = "applied" | "unavailable";

export const PROTECTION_SUMMARY_CODES = {
    APPLIED: "PROTECTION_SUMMARY_APPLIED",
    UNAVAILABLE: "PROTECTION_SUMMARY_UNAVAILABLE",
} as const;

export const PROTECTION_NEXT_STEP_CODES = {
    KEEP_ARTIFACTS: "PROTECTION_NEXT_KEEP_ARTIFACTS",
    REEVALUATE: "PROTECTION_NEXT_REEVALUATE",
} as const;

export class ProtectionResult {
    public readonly assetId: string;
    public readonly status: ProtectionStatus;
    public readonly method: string;
    public readonly artifactId: string | null;
    public readonly limitations: readonly string[];
    public readonly limitationCodes: readonly (string | undefined)[];
    public readonly models: readonly ModelEntry[];
    public readonly nextSteps: readonly string[];
    public readonly nextStepCodes: readonly (string | undefined)[];
    public readonly summary: string;
    public readonly summaryCode: string;
    public readonly summaryParams: Readonly<Record<string, string>>;
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
        this.limitationCodes = this.limitations.map((text) =>
            text === "Protection is experimental and does not guarantee prevention of misuse."
                ? "PROTECTION_LIMIT_EXPERIMENTAL"
                : analysisLimitationCode(text),
        );
        this.models = input.models ?? [];
        this.nextSteps = input.nextSteps ?? [
            "Keep the original and protected artifacts together.",
            "Re-evaluate protection after any model or policy update.",
        ];
        this.nextStepCodes = input.nextSteps
            ? this.nextSteps.map(analysisLimitationCode)
            : [PROTECTION_NEXT_STEP_CODES.KEEP_ARTIFACTS, PROTECTION_NEXT_STEP_CODES.REEVALUATE];
        this.experimental = input.experimental ?? true;
        const applied = this.status === "applied";
        this.summary = applied
            ? `Protection applied on an experimental basis using ${input.method}. This does not guarantee prevention of misuse.`
            : "Protection is unavailable for this asset. This does not establish that the media is safe to publish.";
        this.summaryCode = applied
            ? PROTECTION_SUMMARY_CODES.APPLIED
            : PROTECTION_SUMMARY_CODES.UNAVAILABLE;
        this.summaryParams = { method: input.method };
    }
}
