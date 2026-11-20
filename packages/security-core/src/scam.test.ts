import { describe, expect, it } from "vitest";
import { AnalyzeMessageUseCase } from "@frithward/security-core";

describe("AnalyzeMessageUseCase", () => {
    it("flags credential requests", () => {
        const useCase = new AnalyzeMessageUseCase();
        const result = useCase.execute("Please enter your password now.");
        expect(result.indicators.map((indicator) => indicator.id)).toContain("credential");
        expect(result.summary).toContain("does not establish fraud");
    });

    it("returns no indicators for benign text", () => {
        const useCase = new AnalyzeMessageUseCase();
        const result = useCase.execute("Meeting notes for Tuesday.");
        expect(result.indicators).toHaveLength(0);
    });

    it("attaches result codes to each indicator label and detail", () => {
        const useCase = new AnalyzeMessageUseCase();
        const result = useCase.execute("URGENT: send your password now and keep secret.");
        const urgency = result.indicators.find((indicator) => indicator.id === "urgency");
        expect(urgency?.label).toBe("Urgency pressure");
        expect(urgency?.labelCode).toBe("SCAM_INDICATOR_URGENCY_LABEL");
        expect(urgency?.detailCode).toBe("SCAM_INDICATOR_URGENCY_DETAIL");
        const secrecy = result.indicators.find((indicator) => indicator.id === "secrecy");
        expect(secrecy?.labelCode).toBe("SCAM_INDICATOR_SECRECY_LABEL");
        expect(secrecy?.detailCode).toBe("SCAM_INDICATOR_SECRECY_DETAIL");
    });
});
