import { AppError } from "@frithward/contracts";
import type { ModelEntry } from "@frithward/model-registry";
import { AnalysisLimitations } from "./AnalysisLimitations.js";
import type { DetectionSignal } from "./DetectionSignal.js";

export type AnalysisKind = "audio" | "image" | "video" | "multimodal";

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

export class DetectionReport {
    public readonly assetId: string;
    public readonly kind: AnalysisKind;
    public readonly indicators: readonly DetectionSignal[];
    public readonly limitations: readonly string[];
    public readonly models: readonly ModelEntry[];
    public readonly nextSteps: readonly string[];
    public readonly summary: string;
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
        this.models = input.models ?? [];
        this.nextSteps = input.nextSteps ?? DEFAULT_NEXT_STEPS[input.kind];
        this.createdAt = input.createdAt ?? new Date().toISOString();
        this.summary =
            this.indicators.length > 0
                ? `${this.indicators.length} signal(s) observed for review. This does not establish authenticity or identify any person.`
                : "No manipulation signals observed. Absence of signals does not establish authenticity.";
    }

    public get indicatorCount(): number {
        return this.indicators.length;
    }

    public hasIndicators(): boolean {
        return this.indicators.length > 0;
    }
}
