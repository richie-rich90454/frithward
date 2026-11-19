import { AnalyzeMessageUseCase, type ScamAnalysis } from "@frithward/security-core";
import { AppError } from "@frithward/contracts";
import { recordAnalysis } from "../telemetry/metrics.js";
import { sharedJobStore, type JobStatusStore } from "./jobStore.js";

export interface JobContext {
    jobId: string;
    payload: Record<string, string>;
}

export class AnalyzeJobHandler {
    public constructor(
        private readonly useCase: AnalyzeMessageUseCase = new AnalyzeMessageUseCase(),
        private readonly store: JobStatusStore = sharedJobStore,
    ) {}

    public handle(context: JobContext): ScamAnalysis {
        if (context.jobId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Job id required.");
        this.store.record(context.jobId, "running");
        try {
            if (context.payload.text === undefined || context.payload.text.trim().length === 0) {
                throw new AppError("VALIDATION_FAILED", "Job text payload required.");
            }
            const analysis = this.useCase.execute(context.payload.text);
            recordAnalysis();
            this.store.complete(context.jobId, analysis);
            return analysis;
        } catch (cause) {
            this.store.fail(
                context.jobId,
                cause instanceof Error ? cause.message : "Analysis failed.",
            );
            throw cause;
        }
    }
}
