import { describe, expect, it, vi } from "vitest";
import { AppError } from "@frithward/contracts";
import { DispatchAnalysisUseCase } from "./application/DispatchAnalysisUseCase.js";
import { OrchestratorRoutes } from "./presentation/OrchestratorRoutes.js";
import { errorHandler } from "./presentation/errorHandler.js";
import type { AnalysisRequest, AnalysisResult, WorkerPort } from "./ports/WorkerPort.js";

function mockWorker(result?: AnalysisResult, error?: Error): WorkerPort {
    return {
        analyze: vi
            .fn<(input: AnalysisRequest) => Promise<AnalysisResult>>()
            .mockImplementation(async () => {
                if (error) throw error;
                if (!result) throw new Error("No mock result provided.");
                return result;
            }),
    };
}

describe("DispatchAnalysisUseCase", () => {
    it("dispatches analysis to the worker", async () => {
        const worker = mockWorker({ indicators: [], summary: "clean" });
        const useCase = new DispatchAnalysisUseCase(worker);
        const result = await useCase.execute({ text: "meeting at noon" });
        expect(result.summary).toBe("clean");
        expect(worker.analyze).toHaveBeenCalledWith({ text: "meeting at noon" });
    });

    it("surfaces worker outages as EXTERNAL_UNAVAILABLE", async () => {
        const worker = mockWorker(undefined, new AppError("EXTERNAL_UNAVAILABLE", "down"));
        const routes = new OrchestratorRoutes(new DispatchAnalysisUseCase(worker));
        routes.onError(errorHandler);
        const response = await routes.request("/api/orchestrator/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: "hello" }),
        });
        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            code: "EXTERNAL_UNAVAILABLE",
            message: "down",
        });
    });

    it("rejects invalid payloads with 400", async () => {
        const worker = mockWorker({ indicators: [], summary: "clean" });
        const routes = new OrchestratorRoutes(new DispatchAnalysisUseCase(worker));
        routes.onError(errorHandler);
        const response = await routes.request("/api/orchestrator/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: "" }),
        });
        expect(response.status).toBe(400);
        expect(worker.analyze).not.toHaveBeenCalled();
    });
});
