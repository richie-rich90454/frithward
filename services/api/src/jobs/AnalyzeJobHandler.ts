import { AnalyzeMessageUseCase, type ScamAnalysis } from "@frithward/security-core";
import { AppError } from "@frithward/contracts";

export interface JobContext {
    jobId: string;
    payload: Record<string, string>;
}

export class AnalyzeJobHandler {
    private readonly useCase: AnalyzeMessageUseCase;

    public constructor(useCase: AnalyzeMessageUseCase = new AnalyzeMessageUseCase()) {
        this.useCase = useCase;
    }

    public handle(context: JobContext): ScamAnalysis {
        if (context.jobId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Job id required.");
        if (context.payload.text === undefined || context.payload.text.trim().length === 0) {
            throw new AppError("VALIDATION_FAILED", "Job text payload required.");
        }
        return this.useCase.execute(context.payload.text);
    }
}
