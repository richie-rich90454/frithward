import {
    createContext,
    createEffect,
    createMemo,
    createSignal,
    useContext,
    type Accessor,
} from "solid-js";
import { translator } from "@solid-primitives/i18n";
import { ar } from "../locales/ar.js";
import { de } from "../locales/de.js";
import { en } from "../locales/en.js";
import { es } from "../locales/es.js";
import { fr } from "../locales/fr.js";
import { hi } from "../locales/hi.js";
import { ja } from "../locales/ja.js";
import { zh } from "../locales/zh.js";

export type Locale = "en" | "zh" | "es" | "fr" | "de" | "ar" | "hi" | "ja";

export const LOCALES: readonly Locale[] = ["en", "zh", "es", "fr", "de", "ar", "hi", "ja"];

export const LANGUAGE_NAMES: Record<Locale, string> = {
    en: "English",
    zh: "中文",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    ar: "العربية",
    hi: "हिन्दी",
    ja: "日本語",
};

const dictionaries: Record<Locale, Record<string, string>> = { en, zh, es, fr, de, ar, hi, ja };

const LOCALE_STORAGE_KEY = "frithward.locale";

function browserStorage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

export function readStoredLocale(): Locale {
    const stored = browserStorage()?.getItem(LOCALE_STORAGE_KEY);
    return stored && (LOCALES as readonly string[]).includes(stored) ? (stored as Locale) : "en";
}

export function persistLocale(locale: Locale): void {
    browserStorage()?.setItem(LOCALE_STORAGE_KEY, locale);
}

export interface I18nContextValue {
    locale: Accessor<Locale>;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextValue>();

export function createI18n(): I18nContextValue {
    const [locale, setLocale] = createSignal<Locale>(readStoredLocale());
    const dictionary = createMemo(() => dictionaries[locale()]);
    const t = translator(dictionary);

    createEffect(() => {
        const current = locale();
        document.documentElement.lang = current;
        document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
        persistLocale(current);
    });

    return { locale, setLocale, t };
}

export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext);
    if (!context) throw new Error("useI18n must be used inside LocaleProvider.");
    return context;
}

export { LocaleProvider, LanguageSwitcher } from "./components.jsx";
