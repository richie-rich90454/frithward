import type { Case } from "@frithward/contracts";
import { describe, expect, it } from "vitest";
import type {
    MetadataInspectionView,
    RedactionResultView,
} from "./controllers/ShareCheckController";
import { metadataInspectionToCaseInput, redactionCaseInput } from "./toCaseInput";

const inspection: MetadataInspectionView = {
    fileName: "photo.jpg",
    format: "jpeg",
    fieldCount: 3,
    safeToShare: false,
    issues: [
        {
            id: "gps",
            kind: "exif-gps",
            label: "GPS location",
            value: "51.5",
            where: "GPSPosition",
            why: "Precise location can reveal where you are.",
            how: "Remove location metadata before sharing.",
            severity: "high",
        },
    ],
    remediation: ["Remove location metadata before sharing."],
    summary: "1 privacy issue(s) found in the file's metadata.",
};

const redaction: RedactionResultView = {
    redactedCount: 1,
    remaining: [{ id: "name", kind: "pii-name", detail: "A personal name remains." }],
    summary: "1 finding(s) addressed; download photo-redacted.png to share.",
    note: "Verify the file before sharing.",
    artifact: {
        blob: new Blob(["reencoded"]),
        fileName: "photo-redacted.png",
        method: "re-encoded",
        label: "Re-encoded from decoded pixels.",
    },
};

describe("metadataInspectionToCaseInput", () => {
    it("maps a successful inspection to a file case with findings and metadata artifact", () => {
        const result = metadataInspectionToCaseInput(inspection);
        expect(result.kind).toBe("file");
        expect(result.title).toBe("photo.jpg");
        expect(result.findings).toEqual([
            {
                label: "GPS location",
                severity: "high",
                detail: "Precise location can reveal where you are.",
            },
        ]);
        expect(result.artifacts).toEqual([{ kind: "metadata", name: "photo.jpg" }]);
        expect(result.limitations?.length).toBeGreaterThan(0);
        expect(result.nextSteps).toEqual(["Remove location metadata before sharing."]);
    });

    it("keeps an honest limitation for unverified formats", () => {
        const result = metadataInspectionToCaseInput({ ...inspection, format: "unknown" });
        expect(result.limitations?.[0]).toContain("not inspected");
    });
});

describe("redactionCaseInput", () => {
    it("maps a downloaded redaction to a case with a redacted-file artifact", () => {
        const result = redactionCaseInput(redaction);
        expect(result.kind).toBe("file");
        expect(result.title).toBe("photo-redacted.png");
        expect(result.artifacts).toEqual([{ kind: "redacted-file", name: "photo-redacted.png" }]);
        expect(result.limitations?.length).toBeGreaterThan(0);
    });

    it("updates the existing case instead of creating a duplicate", () => {
        const existing: Case = {
            id: "00000000-0000-4000-8000-000000000000",
            kind: "file",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            title: "photo.jpg",
            inputs: { fileName: "photo.jpg", format: "jpeg" },
            findings: [],
            artifacts: [{ kind: "metadata", name: "photo.jpg" }],
            nextSteps: [],
            limitations: ["Partial inspection."],
            status: "draft",
        };
        const result = redactionCaseInput(redaction, existing) as Case;
        expect(result.id).toBe(existing.id);
        expect(result.artifacts).toEqual([
            { kind: "metadata", name: "photo.jpg" },
            { kind: "redacted-file", name: "photo-redacted.png" },
        ]);
    });
});
