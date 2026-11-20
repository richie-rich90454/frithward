import { AppError } from "@frithward/contracts";
import type { ModelEntry } from "@frithward/model-registry";
import { analysisLimitationCode } from "./AnalysisLimitations.js";
import type { DetectionSignal } from "./DetectionSignal.js";

export type AnalysisKind = "audio" | "image" | "video" | "multimodal";

export const DETECTION_SUMMARY_CODES = {
    SIGNALS: "DETECTION_SUMMARY_SIGNALS",
    NONE: "DETECTION_SUMMARY_NONE",
} as const;

const DEFAULT_NEXT_STEPS: Readonly<Record<AnalysisKind, readonly string[]>> = {
    audio: [
        "Review the flagged audio segments alongside the original recording.",
        "Compare the recording with provenance records where available.",
    ],
    image: [
        "Review the flagged regions alongside the original image.",
        "Compare the image with provenance records where available.",
    ],
    video: [
        "Review the flagged frames alongside the original video.",
        "Compare the video with provenance records where available.",
    ],
    multimodal: [
        "Review the flagged audio and video segments together.",
        "Compare the media with provenance records where available.",
    ],
};

const DEFAULT_NEXT_STEP_CODES: Readonly<Record<AnalysisKind, readonly string[]>> = {
    audio: ["DETECTION_NEXT_REVIEW_AUDIO", "DETECTION_NEXT_PROVENANCE_AUDIO"],
    image: ["DETECTION_NEXT_REVIEW_IMAGE", "DETECTION_NEXT_PROVENANCE_IMAGE"],
    video: ["DETECTION_NEXT_REVIEW_VIDEO", "DETECTION_NEXT_PROVENANCE_VIDEO"],
    multimodal: ["DETECTION_NEXT_REVIEW_MULTIMODAL", "DETECTION_NEXT_PROVENANCE_MULTIMODAL"],
};

export class DetectionReport {
    public readonly assetId: string;
    public readonly kind: AnalysisKind;
    public readonly indicators: readonly DetectionSignal[];
    public readonly limitations: readonly string[];
    public readonly limitationCodes: readonly (string | undefined)[];
    public readonly models: readonly ModelEntry[];
    public readonly nextSteps: readonly string[];
    public readonly nextStepCodes: readonly (string | undefined)[];
    public readonly summary: string;
    public readonly summaryCode: string;
    public readonly summaryParams: Readonly<Record<string, string | number>>;
    public readonly createdAt: string;

    public constructor(input: {
        assetId: string;
        kind: AnalysisKind;
        indicators?: readonly DetectionSignal[];
        limitations?: readonly string[];
        models?: readonly ModelEntry[];
        nextSteps?: readonly string[];
        createdAt?: string;
    }) {
        if (input.assetId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset id required.");
        this.assetId = input.assetId;
        this.kind = input.kind;
        this.indicators = input.indicators ?? [];
        this.limitations = input.limitations ?? AnalysisLimitations.forKind(input.kind);
        this.limitationCodes = this.limitations.map((text) => analysisLimitationCode(text));
        this.models = input.models ?? [];
        this.nextSteps = input.nextSteps ?? DEFAULT_NEXT_STEPS[input.kind];
        this.nextStepCodes = input.nextSteps
            ? this.nextSteps.map(analysisLimitationCode)
            : DEFAULT_NEXT_STEP_CODES[input.kind];
        this.createdAt = input.createdAt ?? new Date().toISOString();
        const hasSignals = this.indicators.length > 0;
        this.summary = hasSignals
            ? `${this.indicators.length} signal(s) observed for review. This does not establish authenticity or identify any person.`
            : "No manipulation signals observed. Absence of signals does not establish authenticity.";
        this.summaryCode = hasSignals
            ? DETECTION_SUMMARY_CODES.SIGNALS
            : DETECTION_SUMMARY_CODES.NONE;
        this.summaryParams = { n: this.indicators.length };
    }

    public get indicatorCount(): number {
        return this.indicators.length;
    }

    public hasIndicators(): boolean {
        return this.indicators.length > 0;
    }
}
