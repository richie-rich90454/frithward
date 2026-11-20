import { describe, expect, it, vi } from "vitest";
import { AppError } from "@frithward/contracts";
import { createApp } from "./app.js";
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

describe("worker metrics", () => {
    const app = createApp();

    it("exposes request, latency, uptime and service-up metrics", async () => {
        const response = await app.request("/metrics");
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/plain; version=0.0.4");
        const body = await response.text();
        expect(body).toContain("http_requests_total");
        expect(body).toContain("http_request_duration_seconds");
        expect(body).toContain("process_uptime_seconds");
        expect(body).toContain('frithward_service_up{service="orchestrator"} 1');
    });

    it("counts requests to other routes, including 404s", async () => {
        await app.request("/health");
        await app.request("/does-not-exist");
        const body = await (await app.request("/metrics")).text();
        const counted = body.split("\n").filter((line) => line.startsWith("http_requests_total{"));
        expect(
            counted.some(
                (line) => line.includes('path="/health"') && line.includes('status="200"'),
            ),
        ).toBe(true);
        expect(counted.some((line) => line.includes('status="404"'))).toBe(true);
    });
});
