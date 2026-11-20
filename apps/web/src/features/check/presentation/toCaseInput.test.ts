import { ScamAnalysis } from "@frithward/security-core";
import { describe, expect, it } from "vitest";
import type { CheckResultSnapshot } from "./controllers/ScamCheckController";
import { checkResultToCaseInput } from "./toCaseInput";

const createdAt = "2026-01-01T00:00:00.000Z";

function snapshot(patch: Partial<CheckResultSnapshot>): CheckResultSnapshot {
    return {
        channel: "message",
        input: "wire the money today",
        analysis: new ScamAnalysis([
            {
                id: "urgency",
                label: "Urgency pressure",
                detail: "The message pushes for an immediate response.",
                severity: "high",
            },
        ]),
        urlView: null,
        qrView: null,
        reviewedFindings: [],
        limitations: ["Text patterns alone cannot prove intent."],
        createdAt,
        ...patch,
    };
}

describe("checkResultToCaseInput", () => {
    it("maps a message result to a message case with findings and next steps", () => {
        const result = checkResultToCaseInput(snapshot({}));
        expect(result.kind).toBe("message");
        expect(result.title).toBe("wire the money today");
        expect(result.findings).toEqual([
            {
                label: "Urgency pressure",
                severity: "high",
                detail: "The message pushes for an immediate response.",
            },
        ]);
        expect(result.nextSteps?.length).toBeGreaterThan(0);
        expect(result.inputs).toEqual({
            channel: "message",
            input: "wire the money today",
        });
    });

    it("maps URL and QR channels with their own findings", () => {
        const url = checkResultToCaseInput(
            snapshot({
                channel: "url",
                analysis: null,
                urlView: {
                    original: "paypa1.example",
                    normalizedUrl: "https://paypa1.example/",
                    hostname: "paypa1.example",
                    riskLevel: "high",
                    findings: [
                        {
                            id: "lookalike",
                            label: "Lookalike domain",
                            detail: "The domain resembles a known brand.",
                            severity: "high",
                        },
                    ],
                    summary: "Risk found",
                    limitations: ["The real website was not checked."],
                },
            }),
        );
        expect(url.kind).toBe("url");
        expect(url.findings?.[0]?.label).toBe("Lookalike domain");
        expect(url.nextSteps).toEqual([]);

        const qr = checkResultToCaseInput(
            snapshot({
                channel: "qr",
                analysis: null,
                qrView: {
                    payload: "WIFI:S:guest;;",
                    payloadKind: "wifi",
                    riskLevel: "medium",
                    findings: [],
                    summary: "Wi-Fi payload",
                    limitations: ["A QR code can point anywhere."],
                },
            }),
        );
        expect(qr.kind).toBe("qr");
        expect(qr.findings).toEqual([]);
    });

    it("preserves honest limitations including the reviewed pass", () => {
        const limitations = [
            "Text patterns alone cannot prove intent.",
            "A rule-based match is not proof of fraud.",
        ];
        const result = checkResultToCaseInput(snapshot({ limitations }));
        expect(result.limitations).toEqual(limitations);
        expect(result.limitations).toContain("A rule-based match is not proof of fraud.");
    });

    it("uses a bounded title snippet from the input", () => {
        const input = `  ${"a".repeat(120)}  `;
        const result = checkResultToCaseInput(snapshot({ input }));
        expect(result.title.length).toBe(81);
        expect(result.title.endsWith("…")).toBe(true);
        expect(result.title.startsWith("a")).toBe(true);
    });
});
