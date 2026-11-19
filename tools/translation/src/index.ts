import { AppError } from "@frithward/contracts";
import type { TranslationPort } from "@frithward/media-core";

export interface TranslationResult {
    text: string;
    translated: boolean;
}

export interface ResultTranslationPort extends TranslationPort {
    translateResult(input: { text: string; from: string; to: string }): Promise<TranslationResult>;
}

export class TranslationTool {
    public constructor(private readonly port: TranslationPort) {
        if (!port) {
            throw new AppError(
                "VALIDATION_FAILED",
                "TranslationTool requires a TranslationPort; none was provided.",
            );
        }
    }

    public async translate(text: string, from: string, to: string): Promise<TranslationResult> {
        if (text.trim().length === 0) throw new AppError("VALIDATION_FAILED", "Text required.");
        const input = { text, from, to };
        const port = this.port as Partial<ResultTranslationPort>;
        if (typeof port.translateResult === "function") {
            return port.translateResult(input);
        }
        const translatedText = await this.port.translate(input);
        return { text: translatedText, translated: translatedText !== text };
    }
}

export * from "./infrastructure/DictionaryTranslationAdapter.js";
