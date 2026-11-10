import { describe, expect, it } from "vitest";
import {
    MetadataInspectionUseCase,
    PiiRedactionPolicy,
    RedactionRegion,
    SanitizedExportUseCase,
    ShareCheckController,
} from "@frithward/privacy-core";

describe("MetadataInspectionUseCase", () => {
    const inspector = new MetadataInspectionUseCase();

    it("detects GPS, device, and timestamp metadata", () => {
        const result = inspector.execute({
            fileName: "photo.jpg",
            fields: {
                GPSLatitude: "40.7128",
                GPSLongitude: "-74.0060",
                Make: "Canon",
                Model: "EOS R5",
                DateTimeOriginal: "2026:01:01 10:00:00",
            },
        });
        const kinds = result.findings.map((finding) => finding.kind);
        expect(kinds).toContain("exif-gps");
        expect(kinds).toContain("exif-device");
        expect(kinds).toContain("exif-timestamp");
        expect(result.safeToShare).toBe(false);
        expect(result.remediation.length).toBeGreaterThan(0);
    });

    it("detects PII in metadata fields", () => {
        const result = inspector.execute({
            fileName: "scan.jpg",
            fields: {
                Artist: "Jane Doe",
                UserComment: "Contact jane.doe@example.com or +1 (555) 123-4567 at 123 Main Street",
            },
        });
        const kinds = result.findings.map((finding) => finding.kind);
        expect(kinds).toContain("pii-name");
        expect(kinds).toContain("pii-email");
        expect(kinds).toContain("pii-phone");
        expect(kinds).toContain("pii-address");
    });

    it("returns no findings for clean metadata", () => {
        const result = inspector.execute({ fileName: "clean.jpg", fields: { Orientation: "1" } });
        expect(result.findings).toHaveLength(0);
        expect(result.safeToShare).toBe(true);
    });

    it("rejects an empty file name", () => {
        expect(() => inspector.execute({ fileName: "  ", fields: {} })).toThrow();
    });
});

describe("PiiRedactionPolicy", () => {
    it("requires redaction for GPS and PII but not device metadata", () => {
        const policy = new PiiRedactionPolicy();
        expect(policy.requiresRedaction([{ kind: "exif-gps" }])).toBe(true);
        expect(policy.requiresRedaction([{ kind: "pii-email" }])).toBe(true);
        expect(policy.requiresRedaction([{ kind: "exif-device" }])).toBe(false);
    });
});

describe("SanitizedExportUseCase", () => {
    const inspector = new MetadataInspectionUseCase();
    const payload = { fileName: "photo.jpg", fields: { GPSLatitude: "1", GPSLongitude: "2" } };

    it("produces a descriptor with remediation actions", () => {
        const result = inspector.execute(payload);
        const descriptor = new SanitizedExportUseCase().execute({
            payload,
            findings: result.findings,
        });
        expect(descriptor.safeToShare).toBe(false);
        expect(descriptor.actions.length).toBeGreaterThan(0);
        expect(descriptor.actions.some((action) => action.kind === "strip-metadata")).toBe(true);
    });

    it("uses a redaction region when one is provided", () => {
        const result = inspector.execute(payload);
        const region = new RedactionRegion({
            x: 0.1,
            y: 0.1,
            width: 0.2,
            height: 0.2,
            kind: "pii-email",
        });
        const descriptor = new SanitizedExportUseCase().execute({
            payload,
            findings: [
                ...result.findings,
                {
                    id: "photo.jpg-pii-email",
                    kind: "pii-email" as const,
                    detail: "email",
                    remediation: "Remove email addresses.",
                    severity: "high" as const,
                },
            ],
            regions: [region],
        });
        expect(descriptor.redactionRegions).toHaveLength(1);
        expect(descriptor.actions.some((action) => action.kind === "pii-email")).toBe(true);
    });
});

describe("ShareCheckController", () => {
    it("builds a view model from metadata", () => {
        const controller = new ShareCheckController();
        const view = controller.inspect({
            fileName: "photo.jpg",
            fields: { GPSLatitude: "1", GPSLongitude: "2" },
        });
        expect(view.safeToShare).toBe(false);
        expect(view.redactionRequired).toBe(true);
        expect(view.findings.length).toBeGreaterThan(0);
        expect(controller.getError()).toBeNull();
    });
});
