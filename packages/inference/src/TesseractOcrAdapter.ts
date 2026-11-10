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

export class TesseractOcrAdapter {
    private worker: Tesseract.Worker | null = null;

    public constructor(private readonly language: string = "eng") {}

    public async start(): Promise<void> {
        if (this.worker) return;
        this.worker = await Tesseract.createWorker(this.language);
    }

    public async stop(): Promise<void> {
        const worker = this.worker;
        this.worker = null;
        if (worker) await worker.terminate();
    }

    // shortcut: tesseract.js exposes no abort handle, so cancellation is checked before and after recognition
    public async recognize(request: TesseractOcrRequest): Promise<TesseractOcrResult> {
        if (!this.worker) throw new Error("Tesseract OCR adapter is not started.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const { data } = await this.worker.recognize(request.image);
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return { text: data.text, confidence: data.confidence };
    }
}
