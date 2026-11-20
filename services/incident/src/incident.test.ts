import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { InMemoryIncidentRepository } from "./infrastructure/InMemoryIncidentRepository.js";
import { errorHandler } from "./presentation/errorHandler.js";
import { IncidentRoutes } from "./presentation/IncidentRoutes.js";
import { IncidentService } from "./application/IncidentService.js";

const EML =
    "From: Alice <alice@example.com>\nTo: Bob <bob@example.org>\nSubject: Test incident\nContent-Type: text/plain; charset=utf-8\n\nPlease review the attached details.\n";

describe("POST /api/incident/parse-email", () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.route("/", new IncidentRoutes(new IncidentService(new InMemoryIncidentRepository())));

    it("returns the parsed email", async () => {
        const response = await app.request("/api/incident/parse-email", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ eml: EML }),
        });
        expect(response.status).toBe(200);
        expect(((await response.json()) as { subject: string }).subject).toBe("Test incident");
    });

    it("validates the request body", async () => {
        const response = await app.request("/api/incident/parse-email", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ eml: "" }),
        });
        expect(response.status).toBe(400);
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
        expect(body).toContain('frithward_service_up{service="incident"} 1');
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
