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
});
