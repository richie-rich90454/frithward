import { AnalyzeMessageUseCase, ScamAnalysis } from "@frithward/security-core";

export class ScamCheckController {
    private readonly analyzer = new AnalyzeMessageUseCase();
    private readonly listeners = new Set<() => void>();
    private analysis: ScamAnalysis | null = null;
    private error: string | null = null;

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getAnalysis(): ScamAnalysis | null {
        return this.analysis;
    }

    public getError(): string | null {
        return this.error;
    }

    public check(text: string): void {
        try {
            this.analysis = this.analyzer.execute(text);
            this.error = null;
        } catch (cause) {
            this.analysis = null;
            this.error = cause instanceof Error ? cause.message : "Analysis failed.";
        }
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
