import { describe, expect, it } from "vitest";
import { IncidentTimelineController } from "./IncidentTimelineController";

function bufferOf(text: string): ArrayBuffer {
    const bytes = new TextEncoder().encode(text);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

describe("IncidentTimelineController evidence", () => {
    it("hashes file content with SHA-256 locally", async () => {
        const controller = new IncidentTimelineController();
        const item = await controller.addEvidence({
            fileName: "invoice.png",
            content: bufferOf("evidence bytes"),
            source: "message attachment",
            collectedAt: "2026-01-01T00:00:00.000Z",
        });
        const expected = await globalThis.crypto.subtle.digest(
            "SHA-256",
            bufferOf("evidence bytes"),
        );
        expect(item.sha256).toBe(
            [...new Uint8Array(expected)].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
        );
        expect(item.fileName).toBe("invoice.png");
        expect(item.source).toBe("message attachment");
        expect(controller.getEvidence()).toEqual([item]);
    });

    it("orders evidence by collection time and exports only recorded items", async () => {
        const controller = new IncidentTimelineController();
        await controller.addEvidence({
            fileName: "later.txt",
            content: bufferOf("later"),
            source: "email",
            collectedAt: "2026-02-01T00:00:00.000Z",
        });
        await controller.addEvidence({
            fileName: "earlier.txt",
            content: bufferOf("earlier"),
            source: "sms",
            collectedAt: "2026-01-01T00:00:00.000Z",
        });
        expect(controller.getEvidence().map((item) => item.fileName)).toEqual([
            "earlier.txt",
            "later.txt",
        ]);
        expect(JSON.parse(controller.buildEvidenceReport())).toEqual(controller.getEvidence());
    });

    it("rejects evidence without a file name instead of inventing one", async () => {
        const controller = new IncidentTimelineController();
        await expect(
            controller.addEvidence({
                fileName: "  ",
                content: bufferOf("x"),
                source: "sms",
            }),
        ).rejects.toThrow("Evidence file name required.");
        expect(controller.getEvidence()).toEqual([]);
    });
});
