import type { PrivacyFinding } from "@frithward/privacy-core";

export interface CommunityReport {
    id: string;
    title: string;
    body: string;
    findings: readonly PrivacyFinding[];
    createdAt: string;
}

export interface ReportRepository {
    save(report: CommunityReport): Promise<void>;
    list(): Promise<readonly CommunityReport[]>;
}
