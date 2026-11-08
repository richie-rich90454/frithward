export class ModelManager {
    private readonly installed = new Set<string>();

    public markInstalled(id: string): void {
        if (id.trim().length === 0) throw new Error("Model id required.");
        this.installed.add(id);
    }

    public isInstalled(id: string): boolean {
        return this.installed.has(id);
    }
}
