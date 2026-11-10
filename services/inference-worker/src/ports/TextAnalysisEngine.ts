import type { ScamIndicator } from "@frithward/contracts";

export interface TextAnalysisResult {
    indicators: readonly ScamIndicator[];
    summary: string;
    nextSteps: readonly string[];
    limitations: readonly string[];
}

export interface TextAnalysisEngine {
    analyze(text: string): TextAnalysisResult;
}
