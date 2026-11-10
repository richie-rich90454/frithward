import { randomUUID } from "node:crypto";
import { RedactPrivacyUseCase, type PrivacyFinding } from "@frithward/privacy-core";
import type { CommunityReport, ReportRepository } from "../ports/ReportRepository.js";

export class SubmitReportUseCase {
    public constructor(
        private readonly privacy: RedactPrivacyUseCase,
        private readonly repository: ReportRepository,
    ) {}

    public async execute(input: {
        title: string;
        body: string;
        findings: readonly PrivacyFinding[];
    }): Promise<{ report: CommunityReport; redactedCount: number }> {
        const redacted = this.privacy.execute({ findings: input.findings });
        const report: CommunityReport = {
            id: randomUUID(),
            title: input.title,
            body: input.body,
            findings: redacted.findings,
            createdAt: new Date().toISOString(),
        };
        await this.repository.save(report);
        return { report, redactedCount: redacted.redactedCount };
    }
}
