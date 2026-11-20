import mermaid from "mermaid";
import { readToken } from "../../../theme/tokens.js";

export interface DiagramRenderResult {
    svg: string;
}

export class DiagramRenderer {
    public async render(source: string): Promise<DiagramRenderResult> {
        if (source.trim() === "") {
            throw new Error("Enter a Mermaid diagram first.");
        }
        mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            themeVariables: {
                primaryColor: readToken("--fw-color-accent-surface", "#f3e5dd"),
                primaryTextColor: readToken("--fw-color-text", "#000000"),
                primaryBorderColor: readToken("--fw-color-accent", "#a3481b"),
                lineColor: readToken("--fw-color-border-strong", "#666666"),
                textColor: readToken("--fw-color-text", "#000000"),
                mainBkg: readToken("--fw-color-surface", "#ffffff"),
                secondaryColor: readToken("--fw-color-surface-secondary", "#e6e6e6"),
                tertiaryColor: readToken("--fw-color-surface", "#ffffff"),
                fontFamily: readToken("--fw-font-sans", "sans-serif"),
            },
        });
        try {
            const id = `diagram-${Math.random().toString(36).slice(2)}`;
            const { svg } = await mermaid.render(id, source);
            return { svg };
        } catch (cause) {
            throw new Error(
                cause instanceof Error ? cause.message : "Could not render the diagram.",
            );
        }
    }
}
