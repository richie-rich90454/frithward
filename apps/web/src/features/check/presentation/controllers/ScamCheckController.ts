import {
    AnalyzeMessageUseCase,
    OlderAdultGuidedFlowController,
    QrInspectionUseCase,
    ScamReportUseCase,
    UrlInspectionUseCase,
    type GuidedFinding,
    type GuidedFlowStep,
    type QrInspectionResult,
    type QrPayloadKind,
    type ScamAnalysis,
    type ScamReport,
    type UrlInspectionResult,
    type UrlRiskLevel,
} from "@frithward/security-core";
import {
    buildReviewedInput,
    findReviewedPatterns,
    REVIEWED_LIMITATIONS,
    type ReviewedMatch,
} from "../../domain/ReviewedPatterns.js";
import {
    LocalStorageRecentCheckRepository,
    type RecentCheck,
    type RecentCheckChannel,
    type RecentCheckRepository,
} from "../../infrastructure/LocalStorageRecentCheckRepository.js";
import { english, type Translator } from "../../../../i18n/translate.js";
import { resultList, resultText } from "../../../../i18n/results.js";

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
    reportUseCase?: Pick<ScamReportUseCase, "execute">;
    recentChecks?: RecentCheckRepository;
    translate?: Translator;
}

/** Self-contained snapshot a Case store can consume later. */
export interface CheckResultSnapshot {
    channel: RecentCheckChannel;
    input: string;
    analysis: ScamAnalysis | null;
    urlView: UrlCheckView | null;
    qrView: QrCheckView | null;
    reviewedFindings: readonly ReviewedMatch[];
    limitations: readonly string[];
    createdAt: string;
}

export class ScamCheckController {
    private readonly analyzer = new AnalyzeMessageUseCase();
    private readonly urlInspector: Pick<UrlInspectionUseCase, "execute">;
    private readonly qrInspector: Pick<QrInspectionUseCase, "execute">;
    private readonly reportUseCase: Pick<ScamReportUseCase, "execute">;
    private readonly recentChecks: RecentCheckRepository;
    private readonly translate: Translator;
    private readonly listeners = new Set<() => void>();
    private currentText = "";
    private analysis: ScamAnalysis | null = null;
    private urlView: UrlCheckView | null = null;
    private qrView: QrCheckView | null = null;
    private reviewedFindings: readonly ReviewedMatch[] = [];
    private lastResult: CheckResultSnapshot | null = null;
    private error: string | null = null;
    private guided = new OlderAdultGuidedFlowController();

    public constructor(options: ScamCheckControllerOptions = {}) {
        this.urlInspector = options.urlInspector ?? new UrlInspectionUseCase();
        this.qrInspector = options.qrInspector ?? new QrInspectionUseCase();
        this.reportUseCase = options.reportUseCase ?? new ScamReportUseCase();
        this.recentChecks = options.recentChecks ?? new LocalStorageRecentCheckRepository();
        this.translate = options.translate ?? english;
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

    /** Supplementary rule-based pass; never presented as the primary analysis. */
    public getReviewedFindings(): readonly ReviewedMatch[] {
        return this.reviewedFindings;
    }

    public getLastResult(): CheckResultSnapshot | null {
        return this.lastResult;
    }

    public getRecentChecks(): readonly RecentCheck[] {
        return this.recentChecks.list();
    }

    public check(text: string): void {
        this.currentText = text;
        try {
            this.analysis = translatedAnalysis(this.translate, this.analyzer.execute(text));
            this.reviewedFindings = findReviewedPatterns(buildReviewedInput(text));
            this.error = null;
            this.syncGuided(this.analysis.indicators);
            this.recordResult("message", text);
        } catch (cause) {
            this.analysis = null;
            this.reviewedFindings = [];
            this.error =
                cause instanceof Error ? cause.message : this.translate("check.error.analysis");
        }
        this.notify();
    }

    public checkUrl(input: string): void {
        try {
            this.urlView = toUrlView(this.translate, this.urlInspector.execute(input));
            this.reviewedFindings = findReviewedPatterns(buildReviewedInput(input));
            this.error = null;
            this.syncGuided(this.urlView.findings);
            this.recordResult("url", input);
        } catch (cause) {
            this.urlView = null;
            this.reviewedFindings = [];
            this.error =
                cause instanceof Error ? cause.message : this.translate("check.error.link");
        }
        this.notify();
    }

    public checkQr(input: string): void {
        try {
            this.qrView = toQrView(this.translate, this.qrInspector.execute(input));
            this.reviewedFindings = findReviewedPatterns(buildReviewedInput(input));
            this.error = null;
            this.syncGuided(this.qrView.findings);
            this.recordResult("qr", input);
        } catch (cause) {
            this.qrView = null;
            this.reviewedFindings = [];
            this.error = cause instanceof Error ? cause.message : this.translate("check.error.qr");
        }
        this.notify();
    }

    public async generateReport(): Promise<ScamReport | null> {
        if (this.currentText.trim().length === 0) {
            this.error = this.translate("check.error.checkBeforeReport");
            this.notify();
            return null;
        }
        try {
            const report = await this.reportUseCase.execute({
                channel: "message",
                description: this.currentText,
                source: "Local scam check",
            });
            this.error = null;
            this.notify();
            return report;
        } catch (cause) {
            this.error =
                cause instanceof Error
                    ? cause.message
                    : this.translate("check.error.generateReport");
            this.notify();
            return null;
        }
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

    private recordResult(channel: RecentCheckChannel, input: string): void {
        const primary =
            channel === "message"
                ? {
                      findings: this.analysis?.indicators ?? [],
                      summary: this.analysis?.summary ?? "",
                      limitations: this.analysis?.limitations ?? [],
                  }
                : channel === "url"
                  ? {
                        findings: this.urlView?.findings ?? [],
                        summary: this.urlView?.summary ?? "",
                        limitations: this.urlView?.limitations ?? [],
                    }
                  : {
                        findings: this.qrView?.findings ?? [],
                        summary: this.qrView?.summary ?? "",
                        limitations: this.qrView?.limitations ?? [],
                    };
        const limitations = [...primary.limitations, ...REVIEWED_LIMITATIONS];
        const createdAt = new Date().toISOString();
        this.lastResult = {
            channel,
            input,
            analysis: this.analysis,
            urlView: this.urlView,
            qrView: this.qrView,
            reviewedFindings: this.reviewedFindings,
            limitations,
            createdAt,
        };
        this.recentChecks.save({
            id: globalThis.crypto.randomUUID(),
            createdAt,
            channel,
            input,
            summary: primary.summary,
            findings: [...primary.findings],
            limitations,
        });
    }

    private syncGuided(findings: readonly GuidedFinding[]): void {
        this.guided = new OlderAdultGuidedFlowController({ findings });
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}

function translatedAnalysis(t: Translator, analysis: ScamAnalysis): ScamAnalysis {
    return {
        ...analysis,
        summary: resultText(t, analysis.summary, analysis.summaryCode),
        limitations: resultList(t, analysis.limitations, analysis.limitationCodes),
    } as ScamAnalysis;
}

function toUrlView(t: Translator, result: UrlInspectionResult): UrlCheckView {
    return {
        original: result.original,
        normalizedUrl: result.normalizedUrl,
        hostname: result.hostname,
        riskLevel: result.riskLevel,
        findings: result.findings.map((finding) => ({
            id: finding.id,
            label: resultText(t, finding.label, finding.labelCode),
            detail: resultText(t, finding.detail, finding.detailCode),
            severity: finding.severity,
        })),
        summary: resultText(t, result.summary, result.summaryCode),
        limitations: resultList(t, result.limitations, result.limitationCodes),
    };
}

function toQrView(t: Translator, result: QrInspectionResult): QrCheckView {
    return {
        payload: result.payload,
        payloadKind: result.payloadKind,
        riskLevel: result.riskLevel,
        findings: result.findings.map((finding) => ({
            id: finding.id,
            label: resultText(t, finding.label, finding.labelCode),
            detail: resultText(t, finding.detail, finding.detailCode),
            severity: finding.severity,
        })),
        summary: resultText(t, result.summary, result.summaryCode),
        limitations: resultList(t, result.limitations, result.limitationCodes),
    };
}
