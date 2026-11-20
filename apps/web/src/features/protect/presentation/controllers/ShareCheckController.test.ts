import { describe, expect, it, vi } from "vitest";
import { ShareCheckController, type FileSanitizer } from "./ShareCheckController";

function le16(value: number): number[] {
    return [value & 0xff, (value >> 8) & 0xff];
}

function le32(value: number): number[] {
    return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff];
}

function jpegWithGps(): Uint8Array {
    const tiff = [
        0x49,
        0x49,
        ...le16(0x2a),
        ...le32(8),
        ...le16(1),
        ...le16(0x8825),
        ...le16(4),
        ...le32(1),
        ...le32(26),
        ...le32(0),
        ...le16(2),
        ...le16(1),
        ...le16(2),
        ...le32(2),
        0x4e,
        0x00,
        0x00,
        0x00,
        ...le16(2),
        ...le16(5),
        ...le32(3),
        ...le32(56),
        ...le32(0),
        ...le32(51),
        ...le32(1),
        ...le32(30),
        ...le32(1),
        ...le32(0),
        ...le32(1),
    ];
    const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
    return new Uint8Array([
        0xff,
        0xd8,
        0xff,
        0xe1,
        (exif.length + 2) >> 8,
        (exif.length + 2) & 0xff,
        ...exif,
        0xff,
        0xda,
        0x00,
        0x00,
        0xff,
        0xd9,
    ]);
}

function sourceFile(): Blob & { name: string } {
    const bytes = jpegWithGps();
    return Object.assign(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer]), {
        name: "photo.jpg",
    });
}

function sanitizer(): FileSanitizer {
    return {
        sanitize: vi.fn(async () => ({
            blob: new Blob(["reencoded"]),
            fileName: "photo-redacted.png",
            method: "re-encoded" as const,
            label: "Re-encoded from decoded pixels.",
        })),
    };
}

describe("ShareCheckController share check", () => {
    it("requires an inspection before executing redaction", async () => {
        const controller = new ShareCheckController();
        await controller.executeRedaction();
        expect(controller.getRedaction()).toBeNull();
        expect(controller.getError()).toBe("Inspect metadata before executing redaction.");
    });

    it("parses real EXIF bytes and reports the GPS finding with its value", async () => {
        const controller = new ShareCheckController({ sanitizer: sanitizer() });
        await controller.inspectFile(sourceFile());
        expect(controller.getMetadataView()?.format).toBe("jpeg");
        expect(controller.getMetadataView()?.fieldCount).toBeGreaterThan(0);
        const gps = controller.getMetadataView()?.issues.find((issue) => issue.kind === "exif-gps");
        expect(gps?.value).toBe("51.5");
        expect(gps?.severity).toBe("high");
        await controller.executeRedaction();
        expect(controller.getRedaction()?.artifact.blob.size).toBeGreaterThan(0);
        expect(controller.getError()).toBeNull();
    });

    it("removes GPS findings and keeps the rest in the descriptor", async () => {
        const controller = new ShareCheckController({ sanitizer: sanitizer() });
        await controller.inspectFile(sourceFile());
        controller.inspectMetadata({
            fileName: "photo.jpg",
            fields: { GPSPosition: "51.5,-0.1", Artist: "Jane Doe" },
        });
        await controller.executeRedaction();
        const result = controller.getRedaction();
        expect(result?.redactedCount).toBe(1);
        expect(result?.remaining.map((finding) => finding.kind)).toEqual(["pii-name"]);
        expect(result?.note).toContain("Verify the file before sharing");
        expect(controller.getError()).toBeNull();
    });

    it("includes selected metadata alongside inspected findings", async () => {
        const controller = new ShareCheckController({ sanitizer: sanitizer() });
        await controller.inspectFile(sourceFile());
        controller.inspectMetadata({ fileName: "photo.jpg", fields: { GPSPosition: "51.5,-0.1" } });
        controller.toggle("exif-gps");
        await controller.executeRedaction();
        expect(controller.getRedaction()?.redactedCount).toBe(2);
        expect(controller.getRedaction()?.remaining).toEqual([]);
    });

    it("requires a file before producing a sanitized artifact", async () => {
        const controller = new ShareCheckController({ sanitizer: sanitizer() });
        controller.inspectMetadata({ fileName: "photo.jpg", fields: { Make: "ACME" } });
        await controller.executeRedaction();
        expect(controller.getRedaction()).toBeNull();
        expect(controller.getError()).toBe("Select a file before executing redaction.");
    });
});
