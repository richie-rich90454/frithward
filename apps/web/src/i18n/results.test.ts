import { describe, expect, it, vi } from "vitest";
import { MetadataInspectionUseCase } from "@frithward/privacy-core";
import { UrlInspectionUseCase } from "@frithward/security-core";
import { C2paInspectionUseCase } from "@frithward/provenance-core";
import { VOICE_PROTECTION_LIMIT_CODES } from "@frithward/media-core";
import { RESULT_CODES, resultCodeForText } from "@frithward/contracts";
import { resultList, resultText } from "./results.js";
import { english } from "./translate.js";

function spyTranslator(expectedKey: string, value: string): (key: string) => string {
    const t = vi.fn((key: string) => (key === expectedKey ? value : key));
    return t;
}

describe("result-code presentation mapping", () => {
    it("falls back to the English text when no translation is available", () => {
        expect(resultText(english, "Plain English text")).toBe("Plain English text");
    });

    it("translates a privacy finding through its code", () => {
        const result = new MetadataInspectionUseCase().execute({
            fileName: "photo.jpg",
            fields: { gps: "51.5,-0.1" },
        });
        const finding = result.findings[0];
        expect(finding?.detailCode).toBe(RESULT_CODES.PRIVACY_GPS_DETAIL);
        const t = spyTranslator(`result.${RESULT_CODES.PRIVACY_GPS_DETAIL}`, "翻译后的详情");
        expect(resultText(t, finding?.detail ?? "", finding?.detailCode)).toBe("翻译后的详情");
    });

    it("translates a security finding through its code", () => {
        const result = new UrlInspectionUseCase().execute("http://example.com");
        const finding = result.findings[0];
        expect(finding?.labelCode).toBe(RESULT_CODES.URL_INSECURE_LABEL);
        const t = spyTranslator(`result.${RESULT_CODES.URL_INSECURE_LABEL}`, " traducido");
        expect(resultText(t, finding?.label ?? "", finding?.labelCode)).toBe(" traducido");
    });

    it("translates a provenance summary through its code", async () => {
        const result = await new C2paInspectionUseCase().execute({ manifest: null });
        expect(result.summaryCode).toBe(RESULT_CODES.C2PA_SUMMARY_MISSING);
        const t = spyTranslator(`result.${RESULT_CODES.C2PA_SUMMARY_MISSING}`, "jenisSummary");
        expect(resultText(t, result.summary, result.summaryCode)).toBe("jenisSummary");
    });

    it("translates media-core limitation codes through the registry", () => {
        const code = VOICE_PROTECTION_LIMIT_CODES[0];
        expect(code).toBe(RESULT_CODES.VOICE_LIMIT_0);
        expect(
            resultCodeForText(
                "Voice protection is experimental and has not been independently evaluated.",
            ),
        ).toBe(code);
        const t = spyTranslator(`result.${code}`, "limitacion");
        expect(
            resultList(t, [
                "Voice protection is experimental and has not been independently evaluated.",
            ]),
        ).toEqual(["limitacion"]);
    });
});
