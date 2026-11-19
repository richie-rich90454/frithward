import { AppError } from "@frithward/contracts";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobStatusRecord {
    jobId: string;
    status: JobStatus;
    result: unknown;
    error: string | null;
}

export interface JobStatusStore {
    record(jobId: string, status: JobStatus): void;
    complete(jobId: string, result: unknown): void;
    fail(jobId: string, error: string): void;
    get(jobId: string): JobStatusRecord | null;
}

// shortcut: in-memory status store shared by the API and an in-process worker; a
// standalone worker process has its own copy. Upgrade to a DB-backed store when
// workers run separately and status must survive restarts.
export class InMemoryJobStatusStore implements JobStatusStore {
    private readonly jobs = new Map<string, JobStatusRecord>();

    public record(jobId: string, status: JobStatus): void {
        this.assertJobId(jobId);
        this.jobs.set(jobId, { jobId, status, result: null, error: null });
    }

    public complete(jobId: string, result: unknown): void {
        this.assertJobId(jobId);
        const record = this.current(jobId);
        this.jobs.set(jobId, { ...record, status: "completed", result });
    }

    public fail(jobId: string, error: string): void {
        this.assertJobId(jobId);
        const record = this.current(jobId);
        this.jobs.set(jobId, { ...record, status: "failed", error });
    }

    public get(jobId: string): JobStatusRecord | null {
        return this.jobs.get(jobId) ?? null;
    }

    private current(jobId: string): JobStatusRecord {
        return this.jobs.get(jobId) ?? { jobId, status: "queued", result: null, error: null };
    }

    private assertJobId(jobId: string): void {
        if (jobId.trim().length === 0) throw new AppError("VALIDATION_FAILED", "Job id required.");
    }
}

export const sharedJobStore: JobStatusStore = new InMemoryJobStatusStore();
