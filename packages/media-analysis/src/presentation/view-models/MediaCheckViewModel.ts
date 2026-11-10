import type { ModelEntry } from "@frithward/model-registry";
import type { AnalysisKind, DetectionReport } from "../../domain/DetectionReport.js";
import type { DetectionSignal } from "../../domain/DetectionSignal.js";

export interface MediaCheckViewModelSignal {
    id: string;
    label: string;
    detail: string;
    severity: DetectionSignal["severity"];
    evidence: string;
    source: string;
}

export interface MediaCheckViewModelModel {
    id: string;
    stage: ModelEntry["stage"];
    license: string;
    intendedUse: string;
    limitations: string;
}

export class MediaCheckViewModel {
    public readonly assetId: string;
    public readonly kind: AnalysisKind;
    public readonly summary: string;
    public readonly signals: readonly MediaCheckViewModelSignal[];
    public readonly limitations: readonly string[];
    public readonly models: readonly MediaCheckViewModelModel[];
    public readonly nextSteps: readonly string[];
    public readonly error: string | null;

    private constructor(input: {
        assetId: string;
        kind: AnalysisKind;
        summary: string;
        signals: readonly MediaCheckViewModelSignal[];
        limitations: readonly string[];
        models: readonly MediaCheckViewModelModel[];
        nextSteps: readonly string[];
        error: string | null;
    }) {
        this.assetId = input.assetId;
        this.kind = input.kind;
        this.summary = input.summary;
        this.signals = input.signals;
        this.limitations = input.limitations;
        this.models = input.models;
        this.nextSteps = input.nextSteps;
        this.error = input.error;
    }

    public static fromReport(report: DetectionReport): MediaCheckViewModel {
        return new MediaCheckViewModel({
            assetId: report.assetId,
            kind: report.kind,
            summary: report.summary,
            signals: report.indicators.map((signal) => ({
                id: signal.id,
                label: signal.label,
                detail: signal.detail,
                severity: signal.severity,
                evidence: signal.evidence,
                source: signal.source,
            })),
            limitations: report.limitations,
            models: report.models.map((model) => ({
                id: model.id,
                stage: model.stage,
                license: model.license,
                intendedUse: model.intendedUse,
                limitations: model.limitations,
            })),
            nextSteps: report.nextSteps,
            error: null,
        });
    }

    public static fromError(
        assetId: string,
        kind: AnalysisKind,
        message: string,
    ): MediaCheckViewModel {
        return new MediaCheckViewModel({
            assetId,
            kind,
            summary: "Analysis could not be completed. This does not establish authenticity.",
            signals: [],
            limitations: [
                "The analysis was incomplete, so the result is inconclusive.",
                "Consequential decisions require independent human review.",
            ],
            models: [],
            nextSteps: [
                "Retry the analysis or inspect the media manually.",
                "Keep the original file as evidence.",
            ],
            error: message,
        });
    }
}
