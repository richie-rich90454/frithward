import Tesseract from "tesseract.js";

export type OcrImage =
    | string
    | Blob
    | HTMLCanvasElement
    | HTMLImageElement
    | HTMLVideoElement
    | OffscreenCanvas;

export interface TesseractOcrRequest {
    readonly image: OcrImage;
    readonly language?: string;
    readonly signal?: AbortSignal;
}

export interface TesseractOcrResult {
    readonly text: string;
    readonly confidence: number;
}

export const LOCAL_TESSDATA_PATH = "/tessdata";

export interface TesseractWorkerOptions {
    readonly langPath: string;
    readonly gzip: true;
}

// Language data is served from apps/web/public/tessdata at the same origin.
export function tesseractWorkerOptions(
    langPath: string = LOCAL_TESSDATA_PATH,
): TesseractWorkerOptions {
    return { langPath, gzip: true };
}

export class TesseractOcrAdapter {
    private worker: Tesseract.Worker | null = null;

    public constructor(
        private readonly language: string = "eng",
        private readonly langPath: string = LOCAL_TESSDATA_PATH,
    ) {}

    public async start(): Promise<void> {
        if (this.worker) return;
        try {
            this.worker = await Tesseract.createWorker(
                this.language,
                1,
                tesseractWorkerOptions(this.langPath),
            );
        } catch (cause) {
            throw new Error(
                `OCR language data is unavailable at ${this.langPath}/${this.language}.traineddata.gz. ` +
                    "Place the file in apps/web/public/tessdata and rebuild; no data is downloaded automatically.",
                { cause },
            );
        }
    }

    public async stop(): Promise<void> {
        const worker = this.worker;
        this.worker = null;
        if (worker) await worker.terminate();
    }

    // shortcut: tesseract.js exposes no abort handle, so cancellation is checked before and after recognition
    public async recognize(request: TesseractOcrRequest): Promise<TesseractOcrResult> {
        // Complexity: O(image size); recognition runs in tesseract.js's worker.
        if (!this.worker) throw new Error("Tesseract OCR adapter is not started.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const { data } = await this.worker.recognize(request.image);
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return { text: data.text, confidence: data.confidence };
    }
}
