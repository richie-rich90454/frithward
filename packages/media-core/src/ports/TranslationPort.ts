export interface TranslationPort {
    translate(input: { text: string; from: string; to: string }): Promise<string>;
}
