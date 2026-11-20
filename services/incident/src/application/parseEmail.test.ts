import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { InMemoryIncidentRepository } from "../infrastructure/InMemoryIncidentRepository.js";
import { errorHandler } from "../presentation/errorHandler.js";
import { IncidentRoutes } from "../presentation/IncidentRoutes.js";
import { IncidentService } from "./IncidentService.js";
import { parseEmail } from "./parseEmail.js";

const EML =
    "From: Alice <alice@example.com>\nTo: Bob <bob@example.org>\nSubject: Test incident\nContent-Type: text/plain; charset=utf-8\n\nPlease review the attached details.\n";

describe("parseEmail", () => {
    it("reads headers and body from a .eml fixture", async () => {
        const eml = await readFile(new URL("./fixtures/sample.eml", import.meta.url), "utf8");
        const parsed = await parseEmail(eml);
        expect(parsed.from).toContain("alice@example.com");
        expect(parsed.subject).toBe("Test incident");
        expect(parsed.text).toContain("Please review the attached details.");
        expect(parsed.attachments).toBe(0);
    });

    it("rejects empty input", async () => {
        await expect(parseEmail("  ")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    });
});

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
