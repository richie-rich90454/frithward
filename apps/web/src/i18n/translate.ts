import { en } from "../locales/en.js";

export type Translator = (key: string) => string;

/** English fallback so headless controllers/tests keep their original messages. */
export const english: Translator = (key) => en[key] ?? key;

export function interpolate(text: string, values: Record<string, string | number>): string {
    return text.replace(/\{(\w+)\}/g, (_match, name: string) => {
        const value = values[name];
        return value === undefined ? "" : String(value);
    });
}
