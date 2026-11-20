import { describe, expect, it } from "vitest";
import { ar } from "../locales/ar.js";
import { de } from "../locales/de.js";
import { en } from "../locales/en.js";
import { es } from "../locales/es.js";
import { fr } from "../locales/fr.js";
import { hi } from "../locales/hi.js";
import { ja } from "../locales/ja.js";
import { zh } from "../locales/zh.js";

const NEW_RESULT_CODES = [
    "C2PA_SUMMARY_MISSING_FRAGMENT",
    "SCAM_NEXT_CONTACT_KNOWN",
    "SCAM_NEXT_NO_SEND",
    "SCAM_NEXT_KEEP_EVIDENCE",
    "GUIDED_PAUSE_TITLE",
    "GUIDED_PAUSE_PLAIN",
    "GUIDED_PAUSE_ACTION",
    "GUIDED_REVIEW_TITLE",
    "GUIDED_REVIEW_PLAIN",
    "GUIDED_REVIEW_NO_FINDINGS",
    "GUIDED_REVIEW_ACTION",
    "GUIDED_CHECK_TITLE",
    "GUIDED_CHECK_PLAIN",
    "GUIDED_CHECK_ACTION",
    "GUIDED_PROTECT_TITLE",
    "GUIDED_PROTECT_PLAIN",
    "GUIDED_PROTECT_ACTION",
    "GUIDED_REPORT_TITLE",
    "GUIDED_REPORT_PLAIN",
    "GUIDED_REPORT_ACTION",
    "GUIDED_SUPPORT_TITLE",
    "GUIDED_SUPPORT_PLAIN",
    "GUIDED_SUPPORT_ACTION",
    "PROTECTION_SUMMARY_APPLIED",
    "PROTECTION_SUMMARY_UNAVAILABLE",
    "PROTECTION_LIMIT_EXPERIMENTAL",
    "PROTECTION_NEXT_KEEP_ARTIFACTS",
    "PROTECTION_NEXT_REEVALUATE",
    "DETECTION_SUMMARY_SIGNALS",
    "DETECTION_SUMMARY_NONE",
    "DETECTION_NEXT_REVIEW_AUDIO",
    "DETECTION_NEXT_PROVENANCE_AUDIO",
    "DETECTION_NEXT_REVIEW_IMAGE",
    "DETECTION_NEXT_PROVENANCE_IMAGE",
    "DETECTION_NEXT_REVIEW_VIDEO",
    "DETECTION_NEXT_PROVENANCE_VIDEO",
    "DETECTION_NEXT_REVIEW_MULTIMODAL",
    "DETECTION_NEXT_PROVENANCE_MULTIMODAL",
    "ANALYSIS_LIMIT_EVIDENCE",
    "ANALYSIS_LIMIT_MODEL_VARIATION",
    "ANALYSIS_LIMIT_HUMAN_REVIEW",
    "ANALYSIS_LIMIT_AUDIO",
    "ANALYSIS_LIMIT_IMAGE",
    "ANALYSIS_LIMIT_VIDEO",
    "ANALYSIS_LIMIT_MULTIMODAL",
] as const;

const NEW_ERROR_CODES = [
    "URL_REQUIRED",
    "URL_LIMIT_EXCEEDED",
    "QR_REQUIRED",
    "QR_LIMIT_EXCEEDED",
    "REPORT_DESCRIPTION_REQUIRED",
    "REPORT_DESCRIPTION_LIMIT",
    "REPORT_SOURCE_REQUIRED",
    "MESSAGE_REQUIRED",
    "MESSAGE_LIMIT_EXCEEDED",
    "GUIDED_STEP_MISSING",
    "GUIDED_STEP_INVALID",
    "REPORTING_UNAVAILABLE",
    "ASSET_ID_REQUIRED",
    "PROTECTION_METHOD_REQUIRED",
    "ANALYSIS_CANCELLED",
] as const;

const dictionaries = { ar, de, en, es, fr, hi, ja, zh };

describe("new result and error codes", () => {
    it("has a result key for every new code in all eight locales", () => {
        for (const code of NEW_RESULT_CODES) {
            const key = `result.${code}`;
            for (const [locale, dictionary] of Object.entries(dictionaries)) {
                expect(dictionary[key]?.trim(), `${locale} missing ${key}`).not.toBe("");
            }
        }
    });

    it("has an error key for every new code in all eight locales", () => {
        for (const code of NEW_ERROR_CODES) {
            const key = `error.${code}`;
            for (const [locale, dictionary] of Object.entries(dictionaries)) {
                expect(dictionary[key]?.trim(), `${locale} missing ${key}`).not.toBe("");
            }
        }
    });
});
