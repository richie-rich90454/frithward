import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { PrivacyFinding } from "@frithward/privacy-core";
import type { CommunityReport } from "../ports/ReportRepository.js";
import { InMemoryReportRepository } from "./InMemoryReportRepository.js";
import {
    createReportRepository,
    DatabaseReportRepository,
    toReport,
} from "./DatabaseReportRepository.js";

const finding: PrivacyFinding = {
    id: "f1",
    kind: "pii-email",
    detail: "email in body",
    remediation: "redact",
};

describe("DatabaseReportRepository", () => {
    it("falls back to memory without DATABASE_URL", async () => {
        const handle = createReportRepository(undefined);
        expect(handle.repository).toBeInstanceOf(InMemoryReportRepository);
        expect(createReportRepository("  ").repository).toBeInstanceOf(InMemoryReportRepository);
        await expect(handle.close()).resolves.toBeUndefined();
    });

    it("maps jsonb findings and timestamps", () => {
        const report = toReport({
            id: "r1",
            title: "title",
            body: "body",
            findings: [finding],
            created_at: new Date("2026-01-01T00:00:00.000Z"),
        });
        expect(report).toEqual({
            id: "r1",
            title: "title",
            body: "body",
            findings: [finding],
            createdAt: "2026-01-01T00:00:00.000Z",
        });
        expect(
            toReport({
                id: "r2",
                title: "t",
                body: "b",
                findings: null,
                created_at: "2026-01-01T00:00:00.000Z",
            }).findings,
        ).toEqual([]);
    });

    it("inserts with parameters and lists rows", async () => {
        const query = vi.fn(async (sql: string, _values?: unknown[]) => ({
            rows: sql.startsWith("select")
                ? [
                      {
                          id: "r1",
                          title: "t",
                          body: "b",
                          findings: [finding],
                          created_at: "2026-01-01T00:00:00.000Z",
                      },
                  ]
                : [],
        }));
        const close = vi.fn(async () => {});
        const repository = new DatabaseReportRepository({ query, end: close } as unknown as Pool);
        const report: CommunityReport = {
            id: "r1",
            title: "t",
            body: "b",
            findings: [finding],
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        await repository.save(report);
        expect(query.mock.calls[0]?.[1]).toEqual([
            "r1",
            "t",
            "b",
            JSON.stringify([finding]),
            report.createdAt,
        ]);
        expect(await repository.list()).toEqual([report]);
        await repository.close();
        expect(close).toHaveBeenCalledOnce();
    });
});
