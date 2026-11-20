import { describe, expect, it } from "vitest";
import { FrithwardClient, SDKError } from "./index.js";

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

function stubFetch(handler: (url: string, init: RequestInit) => Response): typeof fetch {
    return async (input, init) => handler(String(input), init ?? {});
}

const scamResult = {
    id: "a-1",
    channel: "message",
    indicators: [{ id: "i-1", label: "Urgency", detail: "Act now.", severity: "high" }],
    summary: "Likely scam.",
    nextSteps: ["Do not reply."],
    limitations: ["Heuristic only."],
    createdAt: "2026-01-01T00:00:00.000Z",
};

describe("FrithwardClient", () => {
    it("requires a non-empty base URL", () => {
        expect(() => new FrithwardClient({ baseUrl: "  " })).toThrow("Base URL required.");
    });

    it("normalizes the base URL when building endpoints", () => {
        const client = new FrithwardClient({ baseUrl: "http://localhost:3000/" });
        expect(client.endpoint("/health")).toBe("http://localhost:3000/health");
    });

    it("health() parses a successful response", async () => {
        let seen = "";
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch((url) => {
                seen = url;
                return jsonResponse({ status: "ok", service: "frithward", database: "connected" });
            }),
        });

        const result = await client.health();

        expect(seen).toBe("http://localhost:3000/health");
        expect(result).toEqual({ status: "ok", service: "frithward", database: "connected" });
    });

    it("analyzeMessage() parses a synchronous analysis result", async () => {
        let sentBody = "";
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch((_url, init) => {
                sentBody = String(init.body);
                return jsonResponse(scamResult);
            }),
        });

        const result = await client.analyzeMessage("You have won a prize.");

        expect(JSON.parse(sentBody)).toEqual({ text: "You have won a prize." });
        expect(result).toEqual(scamResult);
    });

    it("analyzeMessage() accepts a queued response", async () => {
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(() => jsonResponse({ jobId: "job-1" }, 202)),
        });

        expect(await client.analyzeMessage("Suspicious message")).toEqual({ jobId: "job-1" });
    });

    it("analyzeMessage() rejects empty text before calling fetch", async () => {
        const fetchSpy = stubFetch(() => jsonResponse(scamResult));
        const client = new FrithwardClient({ baseUrl: "http://localhost:3000", fetch: fetchSpy });

        await expect(client.analyzeMessage("")).rejects.toThrow();
    });

    it("throws a typed SDKError with status and code on a non-2xx response", async () => {
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(() =>
                jsonResponse({ code: "VALIDATION_FAILED", message: "Invalid request body." }, 400),
            ),
        });

        try {
            await client.getSession();
            expect.unreachable("expected a rejection");
        } catch (error) {
            expect(error).toBeInstanceOf(SDKError);
            const sdkError = error as SDKError;
            expect(sdkError.status).toBe(400);
            expect(sdkError.code).toBe("VALIDATION_FAILED");
            expect(sdkError.message).toBe("Invalid request body.");
        }
    });

    it("uses a generic code for a non-JSON error body", async () => {
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(() => new Response("gateway down", { status: 503 })),
        });

        await expect(client.health()).rejects.toMatchObject({
            status: 503,
            code: "HTTP_ERROR",
        });
    });

    it("getSession() parses the session payload", async () => {
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(() => jsonResponse({ authenticated: false, user: null })),
        });

        expect(await client.getSession()).toEqual({ authenticated: false, user: null });
    });

    it("getJob() encodes the id and parses the record", async () => {
        let seen = "";
        const record = {
            jobId: "a/b",
            status: "completed",
            result: { ok: true },
            error: null,
        };
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch((url) => {
                seen = url;
                return jsonResponse(record);
            }),
        });

        const result = await client.getJob("a/b");

        expect(seen).toBe("http://localhost:3000/api/jobs/a%2Fb");
        expect(result).toEqual(record);
    });

    it("inspectPrivacy() posts findings and parses the response", async () => {
        const findings = [
            { id: "f-1", kind: "email", detail: "a@b.com", remediation: "Remove it." },
        ];
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(() =>
                jsonResponse({ findings, safe: false, remediation: ["Remove it."] }),
            ),
        });

        expect(await client.inspectPrivacy(findings)).toEqual({
            findings,
            safe: false,
            remediation: ["Remove it."],
        });
    });

    it("verifyProvenance() parses the description", async () => {
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(() => jsonResponse({ description: "Signature valid." })),
        });

        const result = await client.verifyProvenance({
            id: "asset-1",
            signatureStatus: "valid",
            signer: "Example",
            assetSha256: "abc",
            manifest: null,
        });

        expect(result).toEqual({ description: "Signature valid." });
    });

    it("exportCaptions() returns the raw subtitle text", async () => {
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(
                () =>
                    new Response("WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello", { status: 200 }),
            ),
        });

        const result = await client.exportCaptions({
            projectId: "p-1",
            title: "Demo",
            language: "en",
            format: "vtt",
            segments: [{ id: "s-1", startMs: 0, endMs: 1000, text: "Hello" }],
        });

        expect(result).toContain("WEBVTT");
    });

    it("throws SDKError when a successful response does not match its schema", async () => {
        const client = new FrithwardClient({
            baseUrl: "http://localhost:3000",
            fetch: stubFetch(() => jsonResponse({ status: "ok" })),
        });

        await expect(client.health()).rejects.toMatchObject({
            status: 200,
            code: "INVALID_RESPONSE",
        });
    });
});
