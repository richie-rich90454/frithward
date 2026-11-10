export interface ModelEntry {
    id: string;
    stage: "experimental" | "candidate" | "stable" | "deprecated";
    license: string;
    intendedUse: string;
    limitations: string;
}

export class ModelRegistry {
    private readonly models = new Map<string, ModelEntry>();

    public register(card: ModelEntry): void {
        this.models.set(card.id, card);
    }

    public get(id: string): ModelEntry | undefined {
        return this.models.get(id);
    }

    public listStable(): readonly ModelEntry[] {
        return [...this.models.values()].filter((card) => card.stage === "stable");
    }

    public listAll(): readonly ModelEntry[] {
        return [...this.models.values()];
    }
}
