import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n, LOCALES, persistLocale, readStoredLocale } from "./index.js";
import { ar } from "../locales/ar.js";
import { de } from "../locales/de.js";
import { en } from "../locales/en.js";
import { es } from "../locales/es.js";
import { fr } from "../locales/fr.js";
import { hi } from "../locales/hi.js";
import { ja } from "../locales/ja.js";
import { zh } from "../locales/zh.js";

vi.mock("./components.jsx", () => ({ LocaleProvider: () => {}, LanguageSwitcher: () => {} }));

const STORAGE_KEY = "frithward.locale";

function stubStorage(initial: Record<string, string> = {}): Map<string, string> {
    const values = new Map(Object.entries(initial));
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    });
    return values;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("locale persistence", () => {
    it("defaults to en when nothing is stored", () => {
        stubStorage();
        expect(readStoredLocale()).toBe("en");
    });

    it("validates a stored locale against LOCALES", () => {
        stubStorage({ [STORAGE_KEY]: "klingon" });
        expect(readStoredLocale()).toBe("en");
        stubStorage({ [STORAGE_KEY]: "de" });
        expect(readStoredLocale()).toBe("de");
    });

    it("initializes createI18n from the stored locale", () => {
        stubStorage({ [STORAGE_KEY]: "ja" });
        const i18n = createI18n();
        expect(i18n.locale()).toBe("ja");
        i18n.setLocale("fr");
        expect(i18n.locale()).toBe("fr");
    });

    it("writes the locale through the storage stub", () => {
        const values = stubStorage();
        persistLocale("ar");
        expect(values.get(STORAGE_KEY)).toBe("ar");
    });
});

describe("locale dictionaries", () => {
    it("shares one key set across all eight locales, including theme keys", () => {
        const dictionaries = { ar, de, en, es, fr, hi, ja, zh };
        const expected = Object.keys(en).sort();
        expect(LOCALES).toHaveLength(8);
        for (const key of ["settings.theme", "theme.system", "theme.light", "theme.dark"]) {
            expect(expected).toContain(key);
        }
        for (const locale of LOCALES) {
            expect(Object.keys(dictionaries[locale]).sort()).toEqual(expected);
        }
    });
});
