import { AppError } from "@frithward/contracts";
import { Pool } from "pg";
import type { CommunityReport, ReportRepository } from "../ports/ReportRepository.js";
import { InMemoryReportRepository } from "./InMemoryReportRepository.js";

interface ReportRow {
    id: string;
    title: string;
    body: string;
    findings: unknown;
    created_at: string | Date;
}

export function toReport(row: ReportRow): CommunityReport {
    return {
        id: row.id,
        title: row.title,
        body: row.body,
        findings: Array.isArray(row.findings) ? (row.findings as CommunityReport["findings"]) : [],
        createdAt: new Date(row.created_at).toISOString(),
    };
}

/** DATABASE_URL-backed report store; the instance owns its connection pool. */
export class DatabaseReportRepository implements ReportRepository {
    public static fromConnectionString(connectionString: string): DatabaseReportRepository {
        if (connectionString.trim().length === 0)
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "DATABASE_URL is required for persistent reports.",
            );
        return new DatabaseReportRepository(new Pool({ connectionString }));
    }

    public constructor(private readonly pool: Pool) {}

    public async close(): Promise<void> {
        await this.pool.end();
    }

    public async save(report: CommunityReport): Promise<void> {
        await this.pool.query(
            `insert into community_reports (id, title, body, findings, created_at)
             values ($1, $2, $3, $4::jsonb, $5)
             on conflict (id) do update set
               title = excluded.title, body = excluded.body, findings = excluded.findings`,
            [
                report.id,
                report.title,
                report.body,
                JSON.stringify(report.findings),
                report.createdAt,
            ],
        );
    }

    public async list(): Promise<readonly CommunityReport[]> {
        const result = await this.pool.query<ReportRow>(
            "select id, title, body, findings, created_at from community_reports order by created_at desc",
        );
        return result.rows.map(toReport);
    }
}

/** Local-first default: in-memory without DATABASE_URL, persistent with it. */
export function createReportRepository(connectionString: string | undefined): {
    repository: ReportRepository;
    close(): Promise<void>;
} {
    if (!connectionString || connectionString.trim().length === 0)
        return { repository: new InMemoryReportRepository(), close: async () => {} };
    const repository = DatabaseReportRepository.fromConnectionString(connectionString);
    return { repository, close: () => repository.close() };
}
