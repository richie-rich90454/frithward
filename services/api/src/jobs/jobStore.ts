import { AppError } from "@frithward/contracts";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobStatusRecord {
    jobId: string;
    status: JobStatus;
    result: unknown;
    error: string | null;
}

export interface JobStatusStore {
    record(jobId: string, status: JobStatus): Promise<void>;
    complete(jobId: string, result: unknown): Promise<void>;
    fail(jobId: string, error: string): Promise<void>;
    get(jobId: string): Promise<JobStatusRecord | null>;
}

// The in-memory shortcut is no longer the production default: when DATABASE_URL is set the API
// and worker share DatabaseJobStatusStore. This store remains for tests and local no-DB runs.
export class InMemoryJobStatusStore implements JobStatusStore {
    private readonly jobs = new Map<string, JobStatusRecord>();

    public async record(jobId: string, status: JobStatus): Promise<void> {
        this.assertJobId(jobId);
        this.jobs.set(jobId, { jobId, status, result: null, error: null });
    }

    public async complete(jobId: string, result: unknown): Promise<void> {
        this.assertJobId(jobId);
        const record = this.current(jobId);
        this.jobs.set(jobId, { ...record, status: "completed", result });
    }

    public async fail(jobId: string, error: string): Promise<void> {
        this.assertJobId(jobId);
        const record = this.current(jobId);
        this.jobs.set(jobId, { ...record, status: "failed", error });
    }

    public async get(jobId: string): Promise<JobStatusRecord | null> {
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
