import type { ModelEntry } from "@frithward/model-registry";
import type { AnalysisKind, DetectionReport } from "../domain/DetectionReport.js";
import type { DetectionSignal } from "../domain/DetectionSignal.js";

export interface MediaAnalysisReport {
    readonly assetId: string;
    readonly kind: AnalysisKind;
    readonly summary: string;
    readonly indicators: readonly DetectionSignal[];
    readonly limitations: readonly string[];
    readonly models: readonly ModelEntry[];
    readonly nextSteps: readonly string[];
    readonly markdown: string;
}

export class GenerateAnalysisReportUseCase {
    public execute(report: DetectionReport): MediaAnalysisReport {
        const markdown = [
            `# Media analysis report: ${report.assetId}`,
            "",
            `Kind: ${report.kind}`,
            "",
            report.summary,
            "",
            "## Signals",
            ...(report.indicators.length > 0
                ? report.indicators.map(
                      (signal) =>
                          `- ${signal.label} (${signal.severity}): ${signal.detail} Evidence: ${signal.evidence}. Source: ${signal.source}.`,
                  )
                : ["- No signals observed."]),
            "",
            "## Limitations",
            ...report.limitations.map((item) => `- ${item}`),
            "",
            "## Models",
            ...(report.models.length > 0
                ? report.models.map(
                      (model) =>
                          `- ${model.id} (${model.stage}): ${model.intendedUse} License: ${model.license}. Limitations: ${model.limitations}.`,
                  )
                : ["- No model metadata registered."]),
            "",
            "## Next steps",
            ...report.nextSteps.map((step) => `- ${step}`),
            "",
        ].join("\n");
        return {
            assetId: report.assetId,
            kind: report.kind,
            summary: report.summary,
            indicators: report.indicators,
            limitations: report.limitations,
            models: report.models,
            nextSteps: report.nextSteps,
            markdown,
        };
    }
}
