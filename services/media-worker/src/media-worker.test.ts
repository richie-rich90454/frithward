import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

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
        expect(body).toContain('frithward_service_up{service="media-worker"} 1');
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
