import {
    AnalyzeMessageUseCase,
    OlderAdultGuidedFlowController,
    QrInspectionUseCase,
    UrlInspectionUseCase,
    type GuidedFinding,
    type GuidedFlowStep,
    type QrInspectionResult,
    type QrPayloadKind,
    type ScamAnalysis,
    type UrlInspectionResult,
    type UrlRiskLevel,
} from "@frithward/security-core";

export interface CheckFindingView {
    id: string;
    label: string;
    detail: string;
    severity: UrlRiskLevel;
}

export interface UrlCheckView {
    original: string;
    normalizedUrl: string | null;
    hostname: string | null;
    riskLevel: UrlRiskLevel;
    findings: readonly CheckFindingView[];
    summary: string;
    limitations: readonly string[];
}

export interface QrCheckView {
    payload: string;
    payloadKind: QrPayloadKind;
    riskLevel: UrlRiskLevel;
    findings: readonly CheckFindingView[];
    summary: string;
    limitations: readonly string[];
}

export interface ScamCheckControllerOptions {
    urlInspector?: Pick<UrlInspectionUseCase, "execute">;
    qrInspector?: Pick<QrInspectionUseCase, "execute">;
}

export class ScamCheckController {
    private readonly analyzer = new AnalyzeMessageUseCase();
    private readonly urlInspector: Pick<UrlInspectionUseCase, "execute">;
    private readonly qrInspector: Pick<QrInspectionUseCase, "execute">;
    private readonly listeners = new Set<() => void>();
    private analysis: ScamAnalysis | null = null;
    private urlView: UrlCheckView | null = null;
    private qrView: QrCheckView | null = null;
    private error: string | null = null;
    private guided = new OlderAdultGuidedFlowController();

    public constructor(options: ScamCheckControllerOptions = {}) {
        this.urlInspector = options.urlInspector ?? new UrlInspectionUseCase();
        this.qrInspector = options.qrInspector ?? new QrInspectionUseCase();
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getAnalysis(): ScamAnalysis | null {
        return this.analysis;
    }

    public getUrlView(): UrlCheckView | null {
        return this.urlView;
    }

    public getQrView(): QrCheckView | null {
        return this.qrView;
    }

    public getError(): string | null {
        return this.error;
    }

    public check(text: string): void {
        try {
            this.analysis = this.analyzer.execute(text);
            this.error = null;
            this.syncGuided(this.analysis.indicators);
        } catch (cause) {
            this.analysis = null;
            this.error = cause instanceof Error ? cause.message : "Analysis failed.";
        }
        this.notify();
    }

    public checkUrl(input: string): void {
        try {
            this.urlView = toUrlView(this.urlInspector.execute(input));
            this.error = null;
            this.syncGuided(this.urlView.findings);
        } catch (cause) {
            this.urlView = null;
            this.error = cause instanceof Error ? cause.message : "Link check failed.";
        }
        this.notify();
    }

    public checkQr(input: string): void {
        try {
            this.qrView = toQrView(this.qrInspector.execute(input));
            this.error = null;
            this.syncGuided(this.qrView.findings);
        } catch (cause) {
            this.qrView = null;
            this.error = cause instanceof Error ? cause.message : "QR check failed.";
        }
        this.notify();
    }

    public getGuidedStep(): GuidedFlowStep {
        return this.guided.currentStep;
    }

    public getGuidedSteps(): readonly GuidedFlowStep[] {
        return this.guided.steps;
    }

    public getGuidedIndex(): number {
        return this.guided.currentStepIndex;
    }

    public isGuidedComplete(): boolean {
        return this.guided.isComplete;
    }

    public guidedNext(): void {
        this.guided.next();
        this.notify();
    }

    public guidedBack(): void {
        this.guided.back();
        this.notify();
    }

    public guidedComplete(): void {
        this.guided.completeCurrentStep();
        this.notify();
    }

    private syncGuided(findings: readonly GuidedFinding[]): void {
        this.guided = new OlderAdultGuidedFlowController({ findings });
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}

function toUrlView(result: UrlInspectionResult): UrlCheckView {
    return {
        original: result.original,
        normalizedUrl: result.normalizedUrl,
        hostname: result.hostname,
        riskLevel: result.riskLevel,
        findings: result.findings.map((finding) => ({
            id: finding.id,
            label: finding.label,
            detail: finding.detail,
            severity: finding.severity,
        })),
        summary: result.summary,
        limitations: [...result.limitations],
    };
}

function toQrView(result: QrInspectionResult): QrCheckView {
    return {
        payload: result.payload,
        payloadKind: result.payloadKind,
        riskLevel: result.riskLevel,
        findings: result.findings.map((finding) => ({
            id: finding.id,
            label: finding.label,
            detail: finding.detail,
            severity: finding.severity,
        })),
        summary: result.summary,
        limitations: [...result.limitations],
    };
}
