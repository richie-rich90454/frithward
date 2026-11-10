import { AnalyzeMessageUseCase } from "@frithward/security-core";
import type { TextAnalysisEngine, TextAnalysisResult } from "../ports/TextAnalysisEngine.js";

export class SecurityCoreTextAnalysisEngine implements TextAnalysisEngine {
    private readonly useCase: AnalyzeMessageUseCase;

    public constructor(useCase: AnalyzeMessageUseCase = new AnalyzeMessageUseCase()) {
        this.useCase = useCase;
    }

    public analyze(text: string): TextAnalysisResult {
        const analysis = this.useCase.execute(text);
        return {
            indicators: analysis.indicators,
            summary: analysis.summary,
            nextSteps: analysis.nextSteps,
            limitations: analysis.limitations,
        };
    }
}
