import { describe, expect, it } from "vitest";
import { AnalyzeTextUseCase } from "./application/AnalyzeTextUseCase.js";
import { SecurityCoreTextAnalysisEngine } from "./infrastructure/SecurityCoreTextAnalysisEngine.js";
import { InferenceWorkerRoutes } from "./presentation/InferenceWorkerRoutes.js";

describe("AnalyzeTextUseCase", () => {
    it("analyzes text with the local engine", () => {
        const useCase = new AnalyzeTextUseCase(new SecurityCoreTextAnalysisEngine());
        const result = useCase.execute("send your password now");
        expect(result.indicators.map((indicator) => indicator.id)).toContain("credential");
    });

    it("exposes analysis over HTTP", async () => {
        const routes = new InferenceWorkerRoutes(
            new AnalyzeTextUseCase(new SecurityCoreTextAnalysisEngine()),
        );
        const response = await routes.request("/api/inference/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: "wire transfer now" }),
        });
        expect(response.status).toBe(200);
        const body = (await response.json()) as { indicators: { id: string }[] };
        expect(body.indicators.map((indicator) => indicator.id)).toContain("payment");
    });
});
