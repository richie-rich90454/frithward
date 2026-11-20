import { CodedError, ERROR_CODES } from "@frithward/contracts";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

export interface PdfRenderResult {
    pageCount: number;
}

export class PdfRenderController {
    public async render(
        arrayBuffer: ArrayBuffer,
        canvas: HTMLCanvasElement,
    ): Promise<PdfRenderResult> {
        if (arrayBuffer.byteLength === 0) {
            throw new CodedError(ERROR_CODES.PDF_EMPTY, "The PDF is empty.");
        }
        const loadingTask = getDocument({ data: arrayBuffer });
        let pdf: PDFDocumentProxy;
        try {
            pdf = await loadingTask.promise;
        } catch (cause) {
            throw new CodedError(
                ERROR_CODES.PDF_OPEN_FAILED,
                `Could not open PDF: ${causeMessage(cause)}`,
                {
                    detail: causeMessage(cause),
                },
            );
        }
        try {
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1 });
            const context = canvas.getContext("2d");
            if (context === null) {
                throw new Error("A 2D canvas context is unavailable.");
            }
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, viewport }).promise;
            return { pageCount: pdf.numPages };
        } catch (cause) {
            throw new CodedError(
                ERROR_CODES.PDF_RENDER_FAILED,
                `Could not render PDF page: ${causeMessage(cause)}`,
                { detail: causeMessage(cause) },
            );
        } finally {
            await loadingTask.destroy();
        }
    }
}

function causeMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : "unknown error";
}
