import { AppError } from "@frithward/contracts";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { jobStatus } from "../modules/auth/schema.js";
import type { JobStatus, JobStatusRecord, JobStatusStore } from "./jobStore.js";

interface JobWrite {
    jobId: string;
    status: JobStatus;
    result: unknown;
    error: string | null;
}

/** DB-backed job status shared by the API and a separately running worker. */
export class DatabaseJobStatusStore implements JobStatusStore {
    private readonly pool: Pool;
    private readonly db;

    public constructor(connectionString: string) {
        if (connectionString.trim().length === 0)
            throw new AppError("EXTERNAL_UNAVAILABLE", "DATABASE_URL is required for job status.");
        this.pool = new Pool({ connectionString });
        this.db = drizzle(this.pool, { schema: { jobStatus } });
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }

    public async record(jobId: string, status: JobStatus): Promise<void> {
        this.assertJobId(jobId);
        await this.write({ jobId, status, result: null, error: null });
    }

    public async complete(jobId: string, result: unknown): Promise<void> {
        this.assertJobId(jobId);
        await this.write({ jobId, status: "completed", result, error: null });
    }

    public async fail(jobId: string, error: string): Promise<void> {
        this.assertJobId(jobId);
        await this.write({ jobId, status: "failed", result: null, error });
    }

    public async get(jobId: string): Promise<JobStatusRecord | null> {
        const rows = await this.db
            .select()
            .from(jobStatus)
            .where(eq(jobStatus.jobId, jobId))
            .limit(1);
        const row = rows[0];
        if (!row) return null;
        return {
            jobId: row.jobId,
            status: row.status as JobStatus,
            result: row.result ?? null,
            error: row.error ?? null,
        };
    }

    private async write(record: JobWrite): Promise<void> {
        const now = new Date();
        await this.db
            .insert(jobStatus)
            .values({
                jobId: record.jobId,
                status: record.status,
                result: record.result,
                error: record.error,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: jobStatus.jobId,
                set: {
                    status: record.status,
                    result: record.result,
                    error: record.error,
                    updatedAt: now,
                },
            });
    }

    private assertJobId(jobId: string): void {
        if (jobId.trim().length === 0) throw new AppError("VALIDATION_FAILED", "Job id required.");
    }
}
