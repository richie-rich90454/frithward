import { quickAddJob } from "graphile-worker";

export interface EnqueuedJob {
    jobId: string;
}

export interface JobQueue {
    enqueueAnalysis(text: string): Promise<EnqueuedJob>;
}

export class GraphileJobQueue implements JobQueue {
    public constructor(private readonly connectionString: string) {
        if (connectionString.trim().length === 0) throw new Error("Database URL required.");
    }

    public async enqueueAnalysis(text: string): Promise<EnqueuedJob> {
        const job = await quickAddJob(
            { connectionString: this.connectionString },
            "analyze-message",
            { text },
        );
        return { jobId: job.id };
    }
}
