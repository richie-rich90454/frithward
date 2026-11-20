import Tesseract from "tesseract.js";
import type { OcrPort, OcrRequest, OcrResult } from "../application/OcrController.js";

export const LOCAL_TESSDATA_PATH = "/tessdata";

export interface TesseractWorkerOptions {
    readonly langPath: string;
    readonly gzip: true;
}

// eng.traineddata.gz is vendored from @tesseract.js-data/eng into public/tessdata.
// langPath must stay same-origin so COEP require-corp is satisfied.
export function tesseractWorkerOptions(
    langPath: string = LOCAL_TESSDATA_PATH,
): TesseractWorkerOptions {
    return { langPath, gzip: true };
}

// Local mirror of @frithward/inference's TesseractOcrAdapter: the web app depends on
// tesseract.js directly and does not declare the inference workspace package.
export class TesseractOcrAdapter implements OcrPort {
    private worker: Tesseract.Worker | null = null;
    private language = "";

    public constructor(private readonly langPath: string = LOCAL_TESSDATA_PATH) {}

    public async recognize(request: OcrRequest): Promise<OcrResult> {
        if (typeof Worker === "undefined")
            throw new Error("OCR requires Web Workers, which this browser does not support.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (!this.worker || this.language !== request.language) {
            await this.stop();
            this.worker = await this.startWorker(request.language);
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

    private async startWorker(language: string): Promise<Tesseract.Worker> {
        try {
            return await Tesseract.createWorker(language, 1, tesseractWorkerOptions(this.langPath));
        } catch (cause) {
            throw new Error(
                `OCR language data is unavailable at ${this.langPath}/${language}.traineddata.gz. ` +
                    "Place the file in apps/web/public/tessdata and rebuild; no data is downloaded automatically.",
                { cause },
            );
        }
    }
}
