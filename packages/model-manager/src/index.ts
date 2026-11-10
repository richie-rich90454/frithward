export interface InstalledModel {
    id: string;
    sizeBytes: number;
    installedAt: string;
    stage: "experimental" | "candidate" | "stable" | "deprecated";
}

export class ModelManager {
    private readonly installed = new Map<string, InstalledModel>();

    public markInstalled(model: InstalledModel): void {
        if (model.id.trim().length === 0) throw new Error("Model id required.");
        if (model.sizeBytes < 0) throw new Error("Model size must be non-negative.");
        this.installed.set(model.id, model);
    }

    public isInstalled(id: string): boolean {
        return this.installed.has(id);
    }

    public uninstall(id: string): void {
        this.installed.delete(id);
    }

    public totalSizeBytes(): number {
        let total = 0;
        for (const model of this.installed.values()) total += model.sizeBytes;
        return total;
    }

    public listInstalled(): readonly InstalledModel[] {
        return [...this.installed.values()];
    }
}
