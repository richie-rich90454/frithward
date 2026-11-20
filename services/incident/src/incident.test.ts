import { Hono } from "hono";
import { describe, expect, it } from "vitest";
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
