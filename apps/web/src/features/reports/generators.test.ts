import type { Case } from "@frithward/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    AUTHENTICITY_NOTICE,
    buildHtmlReport,
    buildReportPdfBytes,
    downloadHtmlReport,
} from "./generators.js";

const LIMITATION = "Text patterns alone cannot prove intent or establish fraud.";

const caseData: Case = {
    id: "3f2b1c8e-6d4a-4f19-9c2b-7a5e8d1f0b34",
    kind: "message",
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-02T10:30:00.000Z",
    title: "Suspicious payment message",
    inputs: { text: "Pay now or your account will be closed" },
    findings: [
        {
            label: "Urgency pressure",
            severity: "high",
            detail: "The message pushes for an immediate response.",
        },
    ],
    artifacts: [{ kind: "evidence", name: "screenshot.png", hash: "abc123def456" }],
    nextSteps: ["Verify with the sender through a known channel."],
    limitations: [LIMITATION],
    status: "active",
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("HTML report", () => {
    it("includes case content, limitations, artifacts and the authenticity notice", () => {
        const html = buildHtmlReport(caseData);
        for (const fragment of [
            caseData.title,
            caseData.kind,
            caseData.createdAt,
            caseData.updatedAt,
            "Urgency pressure",
            caseData.nextSteps[0] ?? "",
            LIMITATION,
            "abc123def456",
            AUTHENTICITY_NOTICE,
            "<style>",
        ]) {
            expect(html).toContain(fragment);
        }
    });

    it("escapes user-controlled text", () => {
        const html = buildHtmlReport({ ...caseData, title: "<script>alert(1)</script>" });
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("downloads a non-empty text/html blob", () => {
        const captured: { blob: Blob | null } = { blob: null };
        vi.stubGlobal("URL", {
            createObjectURL: (blob: Blob) => {
                captured.blob = blob;
                return "blob:report";
            },
            revokeObjectURL: vi.fn(),
        });
        const click = vi.fn();
        vi.stubGlobal("document", { createElement: vi.fn(() => ({ click })) });

        downloadHtmlReport(caseData);

        expect(captured.blob?.type).toContain("text/html");
        expect(captured.blob?.size).toBeGreaterThan(0);
        expect(click).toHaveBeenCalledTimes(1);
    });
});

describe("PDF report", () => {
    it("produces a PDF with real header bytes", async () => {
        const bytes = await buildReportPdfBytes(caseData);
        expect(bytes.length).toBeGreaterThan(100);
        expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    });

    it("wraps long text without throwing on non-ASCII glyphs", async () => {
        const bytes = await buildReportPdfBytes({
            ...caseData,
            title: "Rapport suspect — 消息",
            findings: [
                {
                    label: "Urgency",
                    severity: "high",
                    detail: `${LIMITATION} `.repeat(20),
                },
            ],
        });
        expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    });
});
