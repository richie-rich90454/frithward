import type { TextAnalysisEngine, TextAnalysisResult } from "../ports/TextAnalysisEngine.js";

export class AnalyzeTextUseCase {
    public constructor(private readonly engine: TextAnalysisEngine) {}

    public execute(text: string): TextAnalysisResult {
        return this.engine.analyze(text);
    }
}
