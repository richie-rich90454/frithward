export interface JobContext {
    jobId: string;
    payload: Record<string, string>;
}

export class AnalyzeJobHandler {
    public async handle(context: JobContext): Promise<void> {
        if (context.jobId.trim().length === 0) throw new Error("Job id required.");
        if (context.payload.text === undefined || context.payload.text.trim().length === 0) {
            throw new Error("Job text payload required.");
        }
    }
}
