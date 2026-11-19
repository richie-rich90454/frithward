import { AnalyzeMessageUseCase } from "@frithward/security-core";

export interface IncidentTimelineEntry {
    id: string;
    title: string;
    detail: string;
}

export interface EvidenceItem {
    id: string;
    fileName: string;
    sha256: string;
    collectedAt: string;
    source: string;
}

export interface EvidenceInput {
    fileName: string;
    content: ArrayBuffer;
    source: string;
    collectedAt?: string;
}

function toHex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class IncidentTimelineController {
    private readonly analyzer = new AnalyzeMessageUseCase();
    private readonly listeners = new Set<() => void>();
    private entries: IncidentTimelineEntry[] = [];
    private evidence: EvidenceItem[] = [];
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

    public getEvidence(): readonly EvidenceItem[] {
        return this.evidence;
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

    public async addEvidence(input: EvidenceInput): Promise<EvidenceItem> {
        const subtle = globalThis.crypto?.subtle;
        if (!subtle) throw new Error("SHA-256 hashing is unavailable in this browser.");
        if (input.fileName.trim().length === 0) throw new Error("Evidence file name required.");
        if (input.source.trim().length === 0) throw new Error("Evidence source required.");

        const digest = await subtle.digest("SHA-256", input.content);
        const item: EvidenceItem = {
            id: globalThis.crypto.randomUUID(),
            fileName: input.fileName.trim(),
            sha256: toHex(digest),
            collectedAt: input.collectedAt ?? new Date().toISOString(),
            source: input.source.trim(),
        };
        this.evidence = [...this.evidence, item].sort((a, b) =>
            a.collectedAt.localeCompare(b.collectedAt),
        );
        this.error = null;
        this.notify();
        return item;
    }

    public buildEvidenceReport(): string {
        return JSON.stringify(this.evidence, null, 2);
    }

    public reset(): void {
        this.entries = [];
        this.evidence = [];
        this.error = null;
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
