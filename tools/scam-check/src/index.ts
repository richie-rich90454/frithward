import type { ScamChannel } from "@frithward/contracts";
import {
    AnalyzeMessageUseCase,
    OlderAdultGuidedFlowController,
    QrInspectionUseCase,
    ScamReportUseCase,
    UrlInspectionUseCase,
    type GuidedFlowStep,
    type QrInspectionResult,
    type ScamAnalysis,
    type ScamReport,
    type UrlInspectionResult,
} from "@frithward/security-core";

export * from "@frithward/security-core";

export class ScamCheckTool {
    private readonly analyzer = new AnalyzeMessageUseCase();
    private readonly urlInspector = new UrlInspectionUseCase();
    private readonly qrInspector = new QrInspectionUseCase();
    private readonly reportUseCase = new ScamReportUseCase();
    private readonly guidedFlow: OlderAdultGuidedFlowController;

    public constructor() {
        this.guidedFlow = new OlderAdultGuidedFlowController({
            reportUseCase: this.reportUseCase,
        });
    }

    public analyze(text: string): ScamAnalysis {
        return this.analyzer.execute(text);
    }

    public inspectUrl(url: string): UrlInspectionResult {
        return this.urlInspector.execute(url);
    }

    public inspectQr(payload: string): QrInspectionResult {
        return this.qrInspector.execute(payload);
    }

    public async report(input: {
        description: string;
        source: string;
        channel?: ScamChannel;
    }): Promise<ScamReport> {
        return this.reportUseCase.execute({
            channel: input.channel ?? "message",
            description: input.description,
            source: input.source,
        });
    }

    public get guidedSteps(): readonly GuidedFlowStep[] {
        return this.guidedFlow.steps;
    }

    public completeGuidedStep(): void {
        this.guidedFlow.completeCurrentStep();
    }

    public nextGuidedStep(): void {
        this.guidedFlow.next();
    }
}
