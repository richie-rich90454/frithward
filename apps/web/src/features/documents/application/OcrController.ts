export interface OcrRequest {
    image: ArrayBuffer;
    language: string;
    signal?: AbortSignal;
}

export interface OcrResult {
    text: string;
    confidence: number;
}

export interface OcrPort {
    recognize(request: OcrRequest): Promise<OcrResult>;
}

export interface OcrRecognition {
    text: string;
    confidence?: number;
    limitations: readonly string[];
}

export const OCR_LIMITATIONS: readonly string[] = [
    "OCR accuracy depends on image quality, font and language coverage.",
    "Recognition runs locally with tesseract.js using bundled language data; nothing is downloaded.",
];

export class OcrController {
    public constructor(private readonly port: OcrPort) {}

    public static async createDefault(): Promise<OcrController> {
        const { TesseractOcrAdapter } = await import("../infrastructure/TesseractOcrAdapter.js");
        return new OcrController(new TesseractOcrAdapter());
    }

    public async recognize(
        image: ArrayBuffer,
        language: string,
        signal?: AbortSignal,
    ): Promise<OcrRecognition> {
        if (image.byteLength === 0) throw new Error("The selected image is empty.");
        if (language.trim().length === 0) throw new Error("An OCR language is required.");
        const result = await this.port.recognize({
            image,
            language,
            ...(signal ? { signal } : {}),
        });
        return {
            text: result.text,
            ...(Number.isFinite(result.confidence) ? { confidence: result.confidence } : {}),
            limitations: OCR_LIMITATIONS,
        };
    }
}
