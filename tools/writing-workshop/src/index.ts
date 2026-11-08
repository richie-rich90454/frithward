export class WritingWorkshopTool {
    private readonly paragraphs: string[] = [];

    public addParagraph(text: string): void {
        if (text.trim().length === 0) throw new Error("Paragraph text required.");
        this.paragraphs.push(text);
    }

    public wordCount(): number {
        return this.paragraphs
            .join(" ")
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
    }
}
