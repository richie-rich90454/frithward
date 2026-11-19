import mermaid from "mermaid";

export interface DiagramRenderResult {
    svg: string;
}

export class DiagramRenderer {
    private initialized = false;

    public async render(source: string): Promise<DiagramRenderResult> {
        if (source.trim() === "") {
            throw new Error("Enter a Mermaid diagram first.");
        }
        if (!this.initialized) {
            mermaid.initialize({ startOnLoad: false });
            this.initialized = true;
        }
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
