export interface IncidentEvidence {
    id: string;
    fileName: string;
    sha256: string;
    collectedAt: string;
    source: string;
}

export class IncidentManagerTool {
    private readonly evidence: IncidentEvidence[] = [];

    public addEvidence(item: IncidentEvidence): void {
        if (item.sha256.trim().length === 0) throw new Error("Evidence hash required.");
        this.evidence.push(item);
    }

    public listEvidence(): readonly IncidentEvidence[] {
        return [...this.evidence].sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
    }
}
