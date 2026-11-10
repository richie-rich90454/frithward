import { AppError } from "@frithward/contracts";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobStatusRecord {
    jobId: string;
    status: JobStatus;
}

export interface JobStatusStore {
    record(jobId: string, status: JobStatus): void;
    get(jobId: string): JobStatusRecord | null;
}

// shortcut: in-memory status store, lost on restart; upgrade to a DB-backed store when workers run in a separate process.
export class InMemoryJobStatusStore implements JobStatusStore {
    private readonly jobs = new Map<string, JobStatus>();

    public record(jobId: string, status: JobStatus): void {
        if (jobId.trim().length === 0) throw new AppError("VALIDATION_FAILED", "Job id required.");
        this.jobs.set(jobId, status);
    }

    public get(jobId: string): JobStatusRecord | null {
        const status = this.jobs.get(jobId);
        return status === undefined ? null : { jobId, status };
    }
}
