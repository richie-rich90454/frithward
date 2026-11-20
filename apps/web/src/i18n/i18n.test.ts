import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_ERROR_CODES, ALL_RESULT_CODES } from "@frithward/contracts";
import { createI18n, LOCALES, persistLocale, readStoredLocale } from "./index.js";
import { ar } from "../locales/ar.js";
import { de } from "../locales/de.js";
import { en } from "../locales/en.js";
import { es } from "../locales/es.js";
import { fr } from "../locales/fr.js";
import { hi } from "../locales/hi.js";
import { ja } from "../locales/ja.js";
import { zh } from "../locales/zh.js";

const CHECK_KEYS = [
    "check.clipboardUnavailable",
    "check.pasteFailed",
    "check.fileTypeUnsupported",
    "check.fileReadFailed",
    "check.pasteButton",
    "check.dropHint",
    "check.chooseFile",
] as const;

const SCAM_INDICATOR_CODES = [
    "SCAM_INDICATOR_URGENCY_LABEL",
    "SCAM_INDICATOR_URGENCY_DETAIL",
    "SCAM_INDICATOR_PAYMENT_LABEL",
    "SCAM_INDICATOR_PAYMENT_DETAIL",
    "SCAM_INDICATOR_CREDENTIAL_LABEL",
    "SCAM_INDICATOR_CREDENTIAL_DETAIL",
    "SCAM_INDICATOR_SECRECY_LABEL",
    "SCAM_INDICATOR_SECRECY_DETAIL",
] as const;

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

    it("keeps keys in the same order with no empty translations across all locales", () => {
        const dictionaries = { ar, de, en, es, fr, hi, ja, zh };
        const expected = Object.keys(en);
        for (const locale of LOCALES) {
            expect(Object.keys(dictionaries[locale])).toEqual(expected);
            for (const key of expected) {
                expect(dictionaries[locale][key]?.trim()).not.toBe("");
            }
        }
    });

    it("has the check status keys and scam indicator codes in all eight locales", () => {
        const dictionaries = { ar, de, en, es, fr, hi, ja, zh };
        const keys = [...CHECK_KEYS, ...SCAM_INDICATOR_CODES.map((code) => `result.${code}`)];
        for (const key of keys) {
            for (const locale of LOCALES) {
                expect(dictionaries[locale][key]?.trim(), `${locale} missing ${key}`).not.toBe("");
            }
        }
    });

    it("has a translation key for every error code in all eight locales", () => {
        const dictionaries = { ar, de, en, es, fr, hi, ja, zh };
        expect(ALL_ERROR_CODES.length).toBeGreaterThan(0);
        for (const code of ALL_ERROR_CODES) {
            const key = `error.${code}`;
            for (const locale of LOCALES) {
                expect(dictionaries[locale][key]?.trim(), `${locale} missing ${key}`).not.toBe("");
            }
        }
    });

    it("has a translation key for every result code in all eight locales", () => {
        const dictionaries = { ar, de, en, es, fr, hi, ja, zh };
        expect(ALL_RESULT_CODES.length).toBeGreaterThan(0);
        for (const code of ALL_RESULT_CODES) {
            const key = `result.${code}`;
            for (const locale of LOCALES) {
                expect(dictionaries[locale][key]?.trim(), `${locale} missing ${key}`).not.toBe("");
            }
        }
    });
});
