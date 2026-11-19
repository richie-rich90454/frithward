import { describe, expect, it } from "vitest";
import { DocumentGenerationController } from "./DocumentGenerationController";
import type {
    DocumentInput,
    SlideInput,
    SpreadsheetInput,
} from "../domain/DocumentModel";

const document: DocumentInput = {
    title: "Quarterly report",
    sections: [{ heading: "Summary", body: "Revenue grew steadily across all regions." }],
};

const sheet: SpreadsheetInput = {
    sheetName: "Data",
    columns: ["Region", "Revenue"],
    rows: [
        ["North", "120"],
        ["South", "95"],
    ],
};

const slides: readonly SlideInput[] = [
    { title: "Overview", bullets: ["First point", "Second point"] },
];

describe("DocumentGenerationController", () => {
    const controller = new DocumentGenerationController();

    it("generates a non-empty docx", async () => {
        const bytes = await controller.generateDocx(document);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.byteLength).toBeGreaterThan(0);
    });

    it("generates a non-empty pdf", async () => {
        const bytes = await controller.generatePdf(document);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.byteLength).toBeGreaterThan(0);
    });

    it("generates a non-empty xlsx", async () => {
        const bytes = await controller.generateXlsx(sheet);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.byteLength).toBeGreaterThan(0);
    });

    it("generates a non-empty pptx", async () => {
        const bytes = await controller.generatePptx(slides);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.byteLength).toBeGreaterThan(0);
    });

    it("rejects invalid input", async () => {
        await expect(controller.generateDocx({ title: "", sections: [] })).rejects.toThrow();
        await expect(controller.generatePdf({ title: "x", sections: [] })).rejects.toThrow();
        await expect(
            controller.generateXlsx({ sheetName: "Data", columns: [], rows: [] }),
        ).rejects.toThrow();
        await expect(controller.generatePptx([])).rejects.toThrow();
    });
});
