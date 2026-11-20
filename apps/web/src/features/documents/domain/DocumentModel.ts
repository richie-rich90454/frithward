import { CodedError, ERROR_CODES } from "@frithward/contracts";

export interface DocumentSection {
    heading: string;
    body: string;
}

export interface DocumentInput {
    title: string;
    sections: readonly DocumentSection[];
}

export interface SpreadsheetInput {
    sheetName: string;
    columns: readonly string[];
    rows: readonly (readonly string[])[];
}

export interface SlideInput {
    title: string;
    bullets: readonly string[];
}

export interface NamedBytes {
    name: string;
    data: Uint8Array;
}

export class DocumentPolicy {
    public validateDocument(input: DocumentInput): void {
        if (input.title.trim() === "") {
            throw new CodedError(
                ERROR_CODES.DOCUMENT_TITLE_REQUIRED,
                "A document title is required.",
            );
        }
        if (input.sections.length === 0) {
            throw new CodedError(
                ERROR_CODES.DOCUMENT_SECTION_REQUIRED,
                "At least one section is required.",
            );
        }
        for (const section of input.sections) {
            if (section.heading.trim() === "") {
                throw new CodedError(
                    ERROR_CODES.DOCUMENT_SECTION_HEADING_REQUIRED,
                    "Every section needs a heading.",
                );
            }
        }
    }

    public validateSpreadsheet(input: SpreadsheetInput): void {
        if (input.columns.length === 0) {
            throw new CodedError(
                ERROR_CODES.DOCUMENT_COLUMN_REQUIRED,
                "At least one column is required.",
            );
        }
        if (input.rows.length === 0) {
            throw new CodedError(
                ERROR_CODES.DOCUMENT_ROW_REQUIRED,
                "At least one row is required.",
            );
        }
        for (const row of input.rows) {
            if (row.length !== input.columns.length) {
                throw new CodedError(
                    ERROR_CODES.DOCUMENT_ROW_COLUMN_MISMATCH,
                    "Every row must match the column count.",
                );
            }
        }
    }

    public validateSlides(slides: readonly SlideInput[]): void {
        if (slides.length === 0) {
            throw new CodedError(
                ERROR_CODES.DOCUMENT_SLIDE_REQUIRED,
                "At least one slide is required.",
            );
        }
        for (const slide of slides) {
            if (slide.title.trim() === "") {
                throw new CodedError(
                    ERROR_CODES.DOCUMENT_SLIDE_TITLE_REQUIRED,
                    "Every slide needs a title.",
                );
            }
        }
    }
}

export function parseSections(text: string): readonly DocumentSection[] {
    const sections: DocumentSection[] = [];
    let heading = "";
    const body: string[] = [];
    const flush = (): void => {
        if (heading.trim() !== "" || body.length > 0) {
            sections.push({ heading, body: body.join("\n") });
        }
    };
    for (const line of text.split(/\r?\n/)) {
        if (line.startsWith("## ")) {
            flush();
            heading = line.slice(3).trim();
            body.length = 0;
        } else if (line.trim() !== "") {
            body.push(line.trim());
        }
    }
    flush();
    return sections;
}

export function parseRows(text: string): SpreadsheetInput {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
        return { sheetName: "Data", columns: [], rows: [] };
    }
    const split = (line: string): string[] => line.split(",").map((cell) => cell.trim());
    const [header, ...rest] = lines;
    return {
        sheetName: "Data",
        columns: split(header ?? ""),
        rows: rest.map(split),
    };
}

export function parseSlides(text: string): readonly SlideInput[] {
    const slides: SlideInput[] = [];
    let current: SlideInput | null = null;
    for (const line of text.split(/\r?\n/)) {
        if (line.startsWith("# ")) {
            if (current !== null) slides.push(current);
            current = { title: line.slice(2).trim(), bullets: [] };
        } else if (line.startsWith("- ") && current !== null) {
            (current.bullets as string[]).push(line.slice(2).trim());
        }
    }
    if (current !== null) slides.push(current);
    return slides;
}
