export class DiagramWorkshopTool {
    private readonly nodes = new Set<string>();

    public addNode(id: string): void {
        if (id.trim().length === 0) throw new Error("Node id required.");
        this.nodes.add(id);
    }

    public listNodes(): readonly string[] {
        return [...this.nodes].sort();
    }
}
