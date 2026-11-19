import { describe, expect, it } from "vitest";
import { CodeHighlighter } from "./CodeHighlighter.js";

describe("CodeHighlighter", () => {
    it("emits token spans for Mermaid source", async () => {
        const html = await new CodeHighlighter().highlight("flowchart TD\n  A[Start] --> B");
        expect(html).toContain("<span");
        expect(html).toContain("flowchart");
    });

    it("highlights an empty snippet without throwing", async () => {
        expect(await new CodeHighlighter().highlight("")).toContain("<pre");
    });
});
