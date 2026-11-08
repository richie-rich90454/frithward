export class DocumentWorkshopTool {
    private readonly pages = new Set<number>();

    public addPage(pageNumber: number): void {
        if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new Error("Page number must be a positive integer.");
        this.pages.add(pageNumber);
    }

    public listPages(): readonly number[] {
        return [...this.pages].sort((a, b) => a - b);
    }
}
