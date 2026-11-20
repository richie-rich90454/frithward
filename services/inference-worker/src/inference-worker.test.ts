import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
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
        expect(body).toContain('frithward_service_up{service="inference-worker"} 1');
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
