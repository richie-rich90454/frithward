import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createMetricsRoutes, metricsMiddleware, recordAnalysis } from "./metrics.js";

describe("Prometheus metrics endpoint", () => {
    it("exposes HTTP duration histogram and the analyses counter", async () => {
        const app = new Hono();
        app.use("*", metricsMiddleware);
        app.get("/ping", (context) => context.text("pong"));
        app.route("/", createMetricsRoutes());

        expect((await app.request("/ping")).status).toBe(200);
        recordAnalysis();

        const response = await app.request("/metrics");
        expect(response.status).toBe(200);
        const body = await response.text();
        expect(body).toContain("http_request_duration_seconds");
        expect(body).toContain("analyses_total");
        expect(body).toMatch(/analyses_total\s+1(?:\s|$)/m);
    });
});
