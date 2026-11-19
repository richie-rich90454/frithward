import {
    createContext,
    createEffect,
    createSignal,
    For,
    useContext,
    type Accessor,
    type ParentProps,
} from "solid-js";
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

export interface I18nContextValue {
    locale: Accessor<Locale>;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextValue>();

export function createI18n(): I18nContextValue {
    const [locale, setLocale] = createSignal<Locale>("en");
    const t = (key: string): string => dictionaries[locale()][key] ?? en[key] ?? key;

    createEffect(() => {
        document.documentElement.lang = locale();
        document.documentElement.dir = locale() === "ar" ? "rtl" : "ltr";
    });

    return { locale, setLocale, t };
}

export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext);
    if (!context) throw new Error("useI18n must be used inside LocaleProvider.");
    return context;
}

export function LocaleProvider(props: ParentProps) {
    return <I18nContext.Provider value={createI18n()}>{props.children}</I18nContext.Provider>;
}

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useI18n();
    return (
        <select
            class="language-switcher"
            aria-label={t("language")}
            value={locale()}
            onChange={(event) => setLocale(event.currentTarget.value as Locale)}
        >
            <For each={LOCALES}>
                {(option) => <option value={option}>{LANGUAGE_NAMES[option]}</option>}
            </For>
        </select>
    );
}
