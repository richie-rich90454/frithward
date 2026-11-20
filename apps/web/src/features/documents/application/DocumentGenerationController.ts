import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { Workbook } from "exceljs";
import { PDFDocument } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import { DocumentPolicy, parseRows, parseSections, parseSlides } from "../domain/DocumentModel";
import type { DocumentInput, SlideInput, SpreadsheetInput } from "../domain/DocumentModel";
import { DocxReader } from "./DocxReader";
import { OcrController } from "./OcrController";
import { ZipController } from "./ZipController";
import { english, interpolate, type Translator } from "../../../i18n/translate.js";
import { translatedError } from "../../../i18n/errors.js";

export type ExportFormat = "docx" | "pdf" | "xlsx" | "pptx";

export interface DocumentWorkshopState {
    title: string;
    sectionsText: string;
    sheetText: string;
    slidesText: string;
    importedHtml: string | null;
    pdfData: ArrayBuffer | null;
    ocrStatus: string | null;
    error: string | null;
    busy: boolean;
}

const INITIAL_STATE: DocumentWorkshopState = {
    title: "",
    sectionsText: "",
    sheetText: "",
    slidesText: "",
    importedHtml: null,
    pdfData: null,
    ocrStatus: null,
    error: null,
    busy: false,
};

export class DocumentGenerationController {
    private readonly policy = new DocumentPolicy();
    private readonly docxReader = new DocxReader();
    private readonly zip = new ZipController();
    private readonly listeners = new Set<() => void>();
    private state: DocumentWorkshopState = INITIAL_STATE;
    private ocr: OcrController | null;
    private readonly translate: Translator;

    public constructor(ocr?: OcrController, translate: Translator = english) {
        this.ocr = ocr ?? null;
        this.translate = translate;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getState(): DocumentWorkshopState {
        return this.state;
    }

    public setTitle(title: string): void {
        this.state = { ...this.state, title, error: null };
        this.notify();
    }

    public setSectionsText(sectionsText: string): void {
        this.state = { ...this.state, sectionsText, error: null };
        this.notify();
    }

    public setSheetText(sheetText: string): void {
        this.state = { ...this.state, sheetText, error: null };
        this.notify();
    }

    public setSlidesText(slidesText: string): void {
        this.state = { ...this.state, slidesText, error: null };
        this.notify();
    }

    public async importDocx(file: File): Promise<void> {
        this.state = { ...this.state, busy: true, error: null };
        this.notify();
        try {
            const html = await this.docxReader.read(await file.arrayBuffer());
            this.state = { ...this.state, importedHtml: html, busy: false };
        } catch (cause) {
            this.state = {
                ...this.state,
                busy: false,
                error: translatedError(cause, this.translate, "documents.error.readDocx"),
            };
        }
        this.notify();
    }

    public async importImageForOcr(file: File): Promise<void> {
        this.state = {
            ...this.state,
            busy: true,
            error: null,
            ocrStatus: this.translate("documents.ocr.recognizing"),
        };
        this.notify();
        try {
            const ocr = await this.getOcr();
            const result = await ocr.recognize(await file.arrayBuffer(), "eng");
            const ocrSection = `## OCR text\n${result.text.trim()}`;
            const existing = this.state.sectionsText.trim();
            this.state = {
                ...this.state,
                busy: false,
                sectionsText: existing.length > 0 ? `${existing}\n\n${ocrSection}` : ocrSection,
                ocrStatus: interpolate(this.translate("documents.ocr.complete"), {
                    confidence:
                        result.confidence === undefined
                            ? ""
                            : interpolate(this.translate("documents.ocr.confidence"), {
                                  n: Math.round(result.confidence),
                              }),
                    limitations: result.limitations.join(" "),
                }),
            };
        } catch (cause) {
            this.state = {
                ...this.state,
                busy: false,
                ocrStatus: null,
                error: translatedError(cause, this.translate, "documents.error.ocrFailed"),
            };
        }
        this.notify();
    }

    public async exportDocument(format: ExportFormat): Promise<void> {
        await this.runExport(async () => {
            const document = this.currentDocument();
            const { bytes, mime, extension } = await this.generate(format, document);
            this.download(bytes, `document.${extension}`, mime);
        });
    }

    public async previewPdf(): Promise<void> {
        await this.runExport(async () => {
            const bytes = await this.generatePdf(this.currentDocument());
            this.state = { ...this.state, pdfData: bytes.buffer as ArrayBuffer };
        });
    }

    public async exportBundle(): Promise<void> {
        await this.runExport(async () => {
            const document = this.currentDocument();
            const generated = await Promise.all([
                this.generate("docx", document),
                this.generate("pdf", document),
                this.generate("xlsx", document),
                this.generate("pptx", document),
            ]);
            const bundle = await this.zip.zip(
                generated.map((item) => ({ name: `document.${item.extension}`, data: item.bytes })),
            );
            this.download(bundle, "document-bundle.zip", "application/zip");
        });
    }

    public async generateDocx(input: DocumentInput): Promise<Uint8Array> {
        this.policy.validateDocument(input);
        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: input.title, bold: true, size: 32 })],
                        }),
                        ...input.sections.flatMap((section) => [
                            new Paragraph({
                                text: section.heading,
                                heading: HeadingLevel.HEADING_1,
                            }),
                            new Paragraph({ children: [new TextRun(section.body)] }),
                        ]),
                    ],
                },
            ],
        });
        return new Uint8Array(await Packer.toArrayBuffer(doc));
    }

    public async generatePdf(input: DocumentInput): Promise<Uint8Array> {
        this.policy.validateDocument(input);
        const pdf = await PDFDocument.create();
        const page = pdf.addPage();
        let y = 760;
        page.drawText(input.title, { x: 50, y, size: 18 });
        y -= 34;
        for (const section of input.sections) {
            if (y < 80) break;
            page.drawText(section.heading, { x: 50, y, size: 13 });
            y -= 22;
            for (const line of this.wrap(section.body, 92)) {
                if (y < 60) break;
                page.drawText(line, { x: 50, y, size: 11 });
                y -= 15;
            }
            y -= 12;
        }
        return pdf.save();
    }

    public async generateXlsx(input: SpreadsheetInput): Promise<Uint8Array> {
        this.policy.validateSpreadsheet(input);
        const workbook = new Workbook();
        const sheet = workbook.addWorksheet(input.sheetName);
        sheet.addRow([...input.columns]);
        for (const row of input.rows) {
            sheet.addRow([...row]);
        }
        return new Uint8Array(await workbook.xlsx.writeBuffer());
    }

    public async generatePptx(slides: readonly SlideInput[]): Promise<Uint8Array> {
        this.policy.validateSlides(slides);
        const pptx = new PptxGenJS();
        for (const slide of slides) {
            const page = pptx.addSlide();
            page.addText(slide.title, { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 28, bold: true });
            slide.bullets.forEach((bullet, index) => {
                page.addText(`- ${bullet}`, {
                    x: 0.8,
                    y: 1.6 + index * 0.5,
                    w: 8,
                    h: 0.4,
                    fontSize: 16,
                });
            });
        }
        const result = await pptx.write({ outputType: "uint8array" });
        return result as Uint8Array;
    }

    private currentDocument(): DocumentInput {
        const input: DocumentInput = {
            title: this.state.title,
            sections: [...parseSections(this.state.sectionsText)],
        };
        this.policy.validateDocument(input);
        return input;
    }

    private async generate(
        format: ExportFormat,
        document: DocumentInput,
    ): Promise<{ bytes: Uint8Array; mime: string; extension: string }> {
        switch (format) {
            case "docx":
                return {
                    bytes: await this.generateDocx(document),
                    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    extension: "docx",
                };
            case "pdf":
                return {
                    bytes: await this.generatePdf(document),
                    mime: "application/pdf",
                    extension: "pdf",
                };
            case "xlsx": {
                const sheet = parseRows(this.state.sheetText);
                this.policy.validateSpreadsheet(sheet);
                return {
                    bytes: await this.generateXlsx(sheet),
                    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    extension: "xlsx",
                };
            }
            case "pptx": {
                const slides = [...parseSlides(this.state.slidesText)];
                this.policy.validateSlides(slides);
                return {
                    bytes: await this.generatePptx(slides),
                    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    extension: "pptx",
                };
            }
        }
    }

    private async runExport(action: () => Promise<void>): Promise<void> {
        this.state = { ...this.state, busy: true, error: null };
        this.notify();
        try {
            await action();
            this.state = { ...this.state, busy: false, error: null };
        } catch (cause) {
            this.state = {
                ...this.state,
                busy: false,
                error: translatedError(cause, this.translate, "documents.error.exportFailed"),
            };
        }
        this.notify();
    }

    private download(bytes: Uint8Array, filename: string, mime: string): void {
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private wrap(text: string, max: number): string[] {
        const lines: string[] = [];
        let line = "";
        for (const word of text.split(/\s+/)) {
            if (word === "") continue;
            if (line === "") {
                line = word;
            } else if (`${line} ${word}`.length <= max) {
                line = `${line} ${word}`;
            } else {
                lines.push(line);
                line = word;
            }
        }
        if (line !== "") lines.push(line);
        return lines;
    }

    private async getOcr(): Promise<OcrController> {
        this.ocr ??= await OcrController.createDefault();
        return this.ocr;
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
