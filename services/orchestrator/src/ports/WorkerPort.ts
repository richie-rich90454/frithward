import type { ScamIndicator } from "@frithward/contracts";

export interface AnalysisRequest {
    text: string;
}

export interface AnalysisResult {
    indicators: readonly ScamIndicator[];
    summary: string;
}

export interface WorkerPort {
    analyze(input: AnalysisRequest): Promise<AnalysisResult>;
}
