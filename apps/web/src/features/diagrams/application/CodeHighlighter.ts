import { codeToHtml } from "shiki";

/** Headless syntax highlighting for Mermaid source, usable outside any component. */
export class CodeHighlighter {
    public async highlight(source: string): Promise<string> {
        return codeToHtml(source, {
            lang: "mermaid",
            themes: { light: "github-light", dark: "github-dark" },
        });
    }
}
