import { AppError, type ScamChannel } from "@frithward/contracts";
import type { ScamReport, ScamReportUseCase } from "../../application/ScamReportUseCase.js";

export interface GuidedFinding {
    label: string;
    detail: string;
}

export interface GuidedFlowStep {
    id: string;
    title: string;
    titleCode: string;
    plainLanguage: string;
    plainLanguageCode: string;
    plainLanguageParams?: Readonly<Record<string, string | number>>;
    action: string;
    actionCode: string;
    completed: boolean;
}

const REPORT_STEP_INDEX = 4;

export class OlderAdultGuidedFlowController {
    private readonly findings: readonly GuidedFinding[];
    private readonly reportUseCase: ScamReportUseCase | null;
    private activeReportId: string | null;
    private stepIndex: number;
    private readonly completed: boolean[];

    public constructor(
        input: {
            findings?: readonly GuidedFinding[];
            reportUseCase?: ScamReportUseCase;
        } = {},
    ) {
        this.findings = input.findings ?? [];
        this.reportUseCase = input.reportUseCase ?? null;
        this.activeReportId = null;
        this.stepIndex = 0;
        this.completed = [false, false, false, false, false, false];
    }

    public get steps(): readonly GuidedFlowStep[] {
        return this.buildSteps();
    }

    public get currentStepIndex(): number {
        return this.stepIndex;
    }

    public get currentStep(): GuidedFlowStep {
        const step = this.buildSteps()[this.stepIndex];
        if (!step) throw new AppError("NOT_FOUND", "No guided step available.");
        return step;
    }

    public get isComplete(): boolean {
        return this.completed.every((done) => done);
    }

    public get reportId(): string | null {
        return this.activeReportId;
    }

    public completeCurrentStep(): void {
        if (this.stepIndex < 0 || this.stepIndex >= this.completed.length)
            throw new AppError("VALIDATION_FAILED", "Invalid guided step.");
        this.completed[this.stepIndex] = true;
    }

    public next(): void {
        if (this.stepIndex < this.completed.length - 1) this.stepIndex += 1;
    }

    public back(): void {
        if (this.stepIndex > 0) this.stepIndex -= 1;
    }

    public reset(): void {
        this.stepIndex = 0;
        this.completed.fill(false);
        this.activeReportId = null;
    }

    public async fileReport(input: {
        description: string;
        source: string;
        channel?: ScamChannel;
    }): Promise<ScamReport> {
        if (!this.reportUseCase)
            throw new AppError("EXTERNAL_UNAVAILABLE", "Reporting is not available.");
        const report = await this.reportUseCase.execute({
            channel: input.channel ?? "message",
            description: input.description,
            source: input.source,
        });
        this.activeReportId = report.id;
        this.completed[REPORT_STEP_INDEX] = true;
        return report;
    }

    private buildSteps(): GuidedFlowStep[] {
        const hasFindings = this.findings.length > 0;
        const findingLines = hasFindings
            ? this.findings.map((finding) => `- ${finding.label}: ${finding.detail}`).join("\n")
            : "We did not find obvious warning signs, but that does not mean the message is safe.";
        const reportLine = this.activeReportId
            ? ` Your report number is ${this.activeReportId}.`
            : "";
        return [
            {
                id: "pause",
                title: "Stop and breathe",
                titleCode: "GUIDED_PAUSE_TITLE",
                plainLanguage:
                    "Do not click, reply, or pay anything right now. It is okay to take your time.",
                plainLanguageCode: "GUIDED_PAUSE_PLAIN",
                action: "Put the phone or mouse down for a moment.",
                actionCode: "GUIDED_PAUSE_ACTION",
                completed: this.completed[0] ?? false,
            },
            {
                id: "review",
                title: "Look at the warning signs",
                titleCode: "GUIDED_REVIEW_TITLE",
                plainLanguage: findingLines,
                plainLanguageCode: hasFindings
                    ? "GUIDED_REVIEW_PLAIN"
                    : "GUIDED_REVIEW_NO_FINDINGS",
                plainLanguageParams: hasFindings ? { findings: findingLines } : undefined,
                action: "Read each point slowly. You can ask someone to read it with you.",
                actionCode: "GUIDED_REVIEW_ACTION",
                completed: this.completed[1] ?? false,
            },
            {
                id: "check",
                title: "Check with someone you trust",
                titleCode: "GUIDED_CHECK_TITLE",
                plainLanguage:
                    "Call a family member or friend using a number you already know. Do not use a number from the message.",
                plainLanguageCode: "GUIDED_CHECK_PLAIN",
                action: "Make the call before you do anything else.",
                actionCode: "GUIDED_CHECK_ACTION",
                completed: this.completed[2] ?? false,
            },
            {
                id: "protect",
                title: "Protect your accounts",
                titleCode: "GUIDED_PROTECT_TITLE",
                plainLanguage:
                    "If you entered a password or code, change it now on the official website or app. Do not use links from the message.",
                plainLanguageCode: "GUIDED_PROTECT_PLAIN",
                action: "Change passwords and turn on extra security if it is offered.",
                actionCode: "GUIDED_PROTECT_ACTION",
                completed: this.completed[3] ?? false,
            },
            {
                id: "report",
                title: "Report it",
                titleCode: "GUIDED_REPORT_TITLE",
                plainLanguage: `Keep the message and report it.${reportLine}`,
                plainLanguageCode: "GUIDED_REPORT_PLAIN",
                plainLanguageParams: { reportLine },
                action: "Save the message and any screenshots.",
                actionCode: "GUIDED_REPORT_ACTION",
                completed: this.completed[4] ?? false,
            },
            {
                id: "support",
                title: "You are not alone",
                titleCode: "GUIDED_SUPPORT_TITLE",
                plainLanguage:
                    "Scams happen to careful people. If money was sent, contact your bank right away and report it.",
                plainLanguageCode: "GUIDED_SUPPORT_PLAIN",
                action: "Keep this page open and take one step at a time.",
                actionCode: "GUIDED_SUPPORT_ACTION",
                completed: this.completed[5] ?? false,
            },
        ];
    }
}
