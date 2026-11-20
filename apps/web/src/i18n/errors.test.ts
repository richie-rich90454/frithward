import { describe, expect, it } from "vitest";
import { AppError, CodedError } from "@frithward/contracts";
import { translatedError } from "./errors.js";
import { english } from "./translate.js";

describe("translatedError", () => {
    it("keeps an AppError message as English fallback", () => {
        expect(translatedError(new Error("URL required."), english)).toBe("URL required.");
    });

    it("translates a surfaced AppError message through its stable code", () => {
        const t = (key: string) => (key === "error.URL_REQUIRED" ? "Se requiere una URL." : key);
        expect(translatedError(new AppError("VALIDATION_FAILED", "URL required."), t)).toBe(
            "Se requiere una URL.",
        );
    });

    it("still interpolates CodedError params", () => {
        const error = new CodedError("PDF_OPEN_FAILED", "Could not open PDF.", {
            detail: "bad file",
        });
        const t = (key: string) => (key === "error.PDF_OPEN_FAILED" ? "No PDF: {detail}" : key);
        expect(translatedError(error, t)).toBe("No PDF: bad file");
    });

    it("uses the fallback key for non-error values", () => {
        expect(translatedError(null, () => "fallback", "check.error.analysis")).toBe("fallback");
    });
});
