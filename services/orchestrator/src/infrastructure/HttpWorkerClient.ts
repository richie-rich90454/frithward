import { AppError } from "@frithward/contracts";
import type { AnalysisRequest, AnalysisResult, WorkerPort } from "../ports/WorkerPort.js";

export class HttpWorkerClient implements WorkerPort {
    public constructor(private readonly baseUrl: string) {
        if (baseUrl.trim().length === 0) throw new Error("Worker base URL required.");
    }

    public async analyze(input: AnalysisRequest): Promise<AnalysisResult> {
        const url = `${this.baseUrl.replace(/\/$/, "")}/api/inference/analyze`;
        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ text: input.text }),
            });
        } catch (cause) {
            throw new AppError("EXTERNAL_UNAVAILABLE", "Inference worker is unavailable.", cause);
        }
        if (!response.ok) {
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                `Inference worker returned ${response.status}.`,
            );
        }
        return (await response.json()) as AnalysisResult;
    }
}
