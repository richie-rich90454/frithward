export class TranslationTool {
    private readonly glossary: ReadonlyMap<string, string>;

    public constructor(glossary?: ReadonlyMap<string, string>) {
        this.glossary = glossary ?? new Map();
    }

    public translate(text: string): string {
        if (text.trim().length === 0) throw new Error("Text required.");
        return this.glossary.get(text) ?? text;
    }
}
