import type { AnalysisRequest, AnalysisResult, WorkerPort } from "../ports/WorkerPort.js";

export class DispatchAnalysisUseCase {
    public constructor(private readonly worker: WorkerPort) {}

    public execute(input: AnalysisRequest): Promise<AnalysisResult> {
        return this.worker.analyze(input);
    }
}
