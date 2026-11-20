import { resultCodeForText } from "@frithward/contracts";
import { interpolate, type Translator } from "./translate.js";

/** Translate a library result string by its code, keeping the English text as fallback. */
export function resultText(
    t: Translator,
    text: string,
    code?: string,
    params: Readonly<Record<string, string | number>> = {},
): string {
    const resolved = code ?? resultCodeForText(text);
    if (!resolved) return text;
    const key = `result.${resolved}`;
    const template = t(key);
    return template && template !== key ? interpolate(template, params) : text;
}

export function resultList(
    t: Translator,
    texts: readonly string[],
    codes: readonly (string | undefined)[] = [],
): string[] {
    return texts.map((text, index) => resultText(t, text, codes[index]));
}
