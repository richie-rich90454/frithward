import Tesseract from "tesseract.js";
import type { OcrPort, OcrRequest, OcrResult } from "../application/OcrController.js";

// Local mirror of @frithward/inference's TesseractOcrAdapter: the web app depends on
// tesseract.js directly and does not declare the inference workspace package.
export class TesseractOcrAdapter implements OcrPort {
    private worker: Tesseract.Worker | null = null;
    private language = "";

    public async recognize(request: OcrRequest): Promise<OcrResult> {
        if (typeof Worker === "undefined")
            throw new Error("OCR requires Web Workers, which this browser does not support.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (!this.worker || this.language !== request.language) {
            await this.stop();
            this.worker = await Tesseract.createWorker(request.language);
            this.language = request.language;
        }
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const { data } = await this.worker.recognize(new Blob([request.image]));
        return { text: data.text, confidence: data.confidence };
    }

    public async stop(): Promise<void> {
        const worker = this.worker;
        this.worker = null;
        this.language = "";
        if (worker) await worker.terminate();
    }
}
