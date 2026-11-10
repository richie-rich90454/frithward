import type { CommunityReport, ReportRepository } from "../ports/ReportRepository.js";

export class InMemoryReportRepository implements ReportRepository {
    private readonly reports: CommunityReport[] = [];

    public async save(report: CommunityReport): Promise<void> {
        this.reports.push(report);
    }

    public async list(): Promise<readonly CommunityReport[]> {
        return [...this.reports];
    }
}
