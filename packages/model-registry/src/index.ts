export interface ModelCard {
    id: string;
    stage: "experimental" | "candidate" | "stable" | "deprecated";
    license: string;
    intendedUse: string;
    limitations: string;
}

export class ModelRegistry {
    private readonly models = new Map<string, ModelCard>();

    public register(card: ModelCard): void {
        this.models.set(card.id, card);
    }

    public get(id: string): ModelCard | undefined {
        return this.models.get(id);
    }

    public listStable(): readonly ModelCard[] {
        return [...this.models.values()].filter((card) => card.stage === "stable");
    }
}
