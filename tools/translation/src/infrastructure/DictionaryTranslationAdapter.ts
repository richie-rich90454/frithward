import type { ResultTranslationPort, TranslationResult } from "../index.js";

export type Dictionary = ReadonlyMap<string, string>;

export function dictionaryKey(from: string, to: string, text: string): string {
    return `${from}:${to}:${text}`;
}

export class DictionaryTranslationAdapter implements ResultTranslationPort {
    public constructor(private readonly dictionary: Dictionary) {}

    public async translate(input: { text: string; from: string; to: string }): Promise<string> {
        return (await this.translateResult(input)).text;
    }

    public async translateResult(input: {
        text: string;
        from: string;
        to: string;
    }): Promise<TranslationResult> {
        const translation = this.dictionary.get(dictionaryKey(input.from, input.to, input.text));
        if (translation === undefined) {
            return { text: input.text, translated: false };
        }
        return { text: translation, translated: true };
    }
}
