import { describe, expect, it } from "vitest";
import type { EvidenceItem } from "./controllers/IncidentTimelineController";
import { evidenceToCaseInput } from "./toCaseInput";

const item: EvidenceItem = {
    id: "00000000-0000-4000-8000-000000000000",
    fileName: "screenshot.png",
    sha256: "a".repeat(64),
    collectedAt: "2026-01-01T00:00:00.000Z",
    source: "Email attachment",
};

describe("evidenceToCaseInput", () => {
    it("maps evidence to an evidence case with the controller's hash", () => {
        const result = evidenceToCaseInput(item);
        expect(result.kind).toBe("evidence");
        expect(result.title).toBe("Email attachment");
        expect(result.artifacts).toEqual([
            { kind: "evidence", name: "screenshot.png", hash: item.sha256 },
        ]);
        expect(result.limitations?.length).toBeGreaterThan(0);
        expect(result.inputs).toEqual({
            fileName: "screenshot.png",
            source: "Email attachment",
            collectedAt: item.collectedAt,
        });
    });

    it("uses the imported report id as the title", () => {
        const result = evidenceToCaseInput(item, {
            id: "report-42",
            description: "Payment request",
        });
        expect(result.title).toBe("report-42");
    });

    it("falls back to the report description for untitled reports", () => {
        const result = evidenceToCaseInput(item, { description: "Payment request" });
        expect(result.title).toBe("Payment request");
    });
});
