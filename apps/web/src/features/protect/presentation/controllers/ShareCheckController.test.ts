import { describe, expect, it } from "vitest";
import { ShareCheckController } from "./ShareCheckController";

describe("ShareCheckController redaction", () => {
    it("requires an inspection before executing redaction", () => {
        const controller = new ShareCheckController();
        controller.executeRedaction();
        expect(controller.getRedaction()).toBeNull();
        expect(controller.getError()).toBe("Inspect metadata before executing redaction.");
    });

    it("removes GPS findings and keeps the rest in the descriptor", () => {
        const controller = new ShareCheckController();
        controller.inspectMetadata({
            fileName: "photo.jpg",
            fields: { GPSPosition: "51.5,-0.1", Artist: "Jane Doe" },
        });
        controller.executeRedaction();
        const result = controller.getRedaction();
        expect(result?.redactedCount).toBe(1);
        expect(result?.remaining.map((finding) => finding.kind)).toEqual(["pii-name"]);
        expect(result?.note).toContain("does not rewrite file bytes");
        expect(controller.getError()).toBeNull();
    });

    it("includes selected metadata alongside inspected findings", () => {
        const controller = new ShareCheckController();
        controller.inspectMetadata({
            fileName: "photo.jpg",
            fields: { GPSPosition: "51.5,-0.1" },
        });
        controller.toggle("exif-gps");
        controller.executeRedaction();
        expect(controller.getRedaction()?.redactedCount).toBe(2);
        expect(controller.getRedaction()?.remaining).toEqual([]);
    });
});
