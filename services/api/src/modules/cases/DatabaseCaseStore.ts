import { randomUUID } from "node:crypto";
import {
    AppError,
    CaseKind,
    CaseStatus,
    type Case,
    type CreateCaseInput,
    type UpdateCaseInput,
} from "@frithward/contracts";
import { Pool } from "pg";
import type { CaseStore } from "./CaseStore.js";

interface CaseRow {
    id: string;
    kind: string;
    title: string;
    inputs: unknown;
    findings: unknown;
    artifacts: unknown;
    next_steps: unknown;
    limitations: unknown;
    status: string;
    created_at: string | Date;
    updated_at: string | Date;
}

const COLUMNS =
    "id, kind, title, inputs, findings, artifacts, next_steps, limitations, status, created_at, updated_at";

function iso(value: string | Date): string {
    return new Date(value).toISOString();
}

function arrayValue(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function toCase(row: CaseRow): Case {
    return {
        id: row.id,
        kind: CaseKind.parse(row.kind),
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
        title: row.title,
        inputs:
            typeof row.inputs === "object" && row.inputs !== null && !Array.isArray(row.inputs)
                ? (row.inputs as Case["inputs"])
                : {},
        findings: arrayValue(row.findings) as Case["findings"],
        artifacts: arrayValue(row.artifacts) as Case["artifacts"],
        nextSteps: arrayValue(row.next_steps) as string[],
        limitations: arrayValue(row.limitations) as string[],
        status: CaseStatus.parse(row.status),
    };
}

function values(record: Case): unknown[] {
    return [
        record.id,
        record.kind,
        record.title,
        JSON.stringify(record.inputs),
        JSON.stringify(record.findings),
        JSON.stringify(record.artifacts),
        JSON.stringify(record.nextSteps),
        JSON.stringify(record.limitations),
        record.status,
        record.createdAt,
        record.updatedAt,
    ];
}

const UPSERT = `insert into cases (${COLUMNS})
values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11)
on conflict (id) do update set
  kind = excluded.kind, title = excluded.title, inputs = excluded.inputs,
  findings = excluded.findings, artifacts = excluded.artifacts,
  next_steps = excluded.next_steps, limitations = excluded.limitations,
  status = excluded.status, updated_at = excluded.updated_at`;

/** Persistent case store. Created only when DATABASE_URL is configured. */
export class DatabaseCaseStore implements CaseStore {
    public static fromConnectionString(connectionString: string): DatabaseCaseStore {
        if (connectionString.trim().length === 0)
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "DATABASE_URL is required for persistent cases.",
            );
        return new DatabaseCaseStore(new Pool({ connectionString }));
    }

    public constructor(private readonly pool: Pool) {}

    public async close(): Promise<void> {
        await this.pool.end();
    }

    public async create(input: CreateCaseInput): Promise<Case> {
        const now = new Date().toISOString();
        const record: Case = {
            id: randomUUID(),
            kind: input.kind,
            createdAt: now,
            updatedAt: now,
            title: input.title,
            inputs: input.inputs,
            findings: input.findings ?? [],
            artifacts: input.artifacts ?? [],
            nextSteps: input.nextSteps ?? [],
            limitations: input.limitations ?? [],
            status: input.status ?? "draft",
        };
        await this.pool.query(UPSERT, values(record));
        return record;
    }

    public async get(id: string): Promise<Case | null> {
        const result = await this.pool.query<CaseRow>(
            `select ${COLUMNS} from cases where id = $1 limit 1`,
            [id],
        );
        const row = result.rows[0];
        return row ? toCase(row) : null;
    }

    public async list(): Promise<readonly Case[]> {
        const result = await this.pool.query<CaseRow>(
            `select ${COLUMNS} from cases order by created_at desc`,
        );
        return result.rows.map(toCase);
    }

    public async update(id: string, input: UpdateCaseInput): Promise<Case | null> {
        const existing = await this.get(id);
        if (!existing) return null;
        const record: Case = {
            ...existing,
            kind: input.kind ?? existing.kind,
            title: input.title ?? existing.title,
            inputs: input.inputs ?? existing.inputs,
            findings: input.findings ?? existing.findings,
            artifacts: input.artifacts ?? existing.artifacts,
            nextSteps: input.nextSteps ?? existing.nextSteps,
            limitations: input.limitations ?? existing.limitations,
            status: input.status ?? existing.status,
            updatedAt: new Date().toISOString(),
        };
        await this.pool.query(UPSERT, values(record));
        return record;
    }

    public async remove(id: string): Promise<boolean> {
        const result = await this.pool.query("delete from cases where id = $1", [id]);
        return (result.rowCount ?? 0) > 0;
    }
}

/** null keeps the API honest when no database is configured. */
export function createCaseStore(connectionString: string | undefined): DatabaseCaseStore | null {
    if (!connectionString || connectionString.trim().length === 0) return null;
    return DatabaseCaseStore.fromConnectionString(connectionString);
}
