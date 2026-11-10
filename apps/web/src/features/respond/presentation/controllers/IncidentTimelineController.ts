import { AnalyzeMessageUseCase } from "@frithward/security-core";

export interface IncidentTimelineEntry {
    id: string;
    title: string;
    detail: string;
}

export class IncidentTimelineController {
    private readonly analyzer = new AnalyzeMessageUseCase();
    private readonly listeners = new Set<() => void>();
    private entries: IncidentTimelineEntry[] = [];
    private error: string | null = null;

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getEntries(): readonly IncidentTimelineEntry[] {
        return this.entries;
    }

    public getError(): string | null {
        return this.error;
    }

    public analyze(input: { text: string; receivedAt: string }): void {
        try {
            const analysis = this.analyzer.execute(input.text);
            this.entries = [
                { id: "received", title: "Message recorded", detail: input.receivedAt },
                ...analysis.indicators.map((indicator) => ({
                    id: indicator.id,
                    title: indicator.label,
                    detail: indicator.detail,
                })),
                ...analysis.nextSteps.map((step, index) => ({
                    id: `step-${index + 1}`,
                    title: "Next step",
                    detail: step,
                })),
            ];
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Could not analyze message.";
        }
        this.notify();
    }

    public reset(): void {
        this.entries = [];
        this.error = null;
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
