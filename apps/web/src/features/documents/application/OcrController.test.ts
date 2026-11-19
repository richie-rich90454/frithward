import { describe, expect, it, vi } from "vitest";
import { OcrController, type OcrPort } from "./OcrController";

describe("OcrController", () => {
    it("returns recognized text, confidence and honest limitations", async () => {
        const port: OcrPort = {
            recognize: vi.fn().mockResolvedValue({ text: "Invoice 42", confidence: 91.5 }),
        };
        const controller = new OcrController(port);
        const image = new ArrayBuffer(8);

        const result = await controller.recognize(image, "eng");

        expect(port.recognize).toHaveBeenCalledWith({ image, language: "eng" });
        expect(result.text).toBe("Invoice 42");
        expect(result.confidence).toBe(91.5);
        expect(result.limitations.length).toBeGreaterThan(0);
        expect(result.limitations.join(" ")).toContain("accuracy");
    });

    it("passes the caller's abort signal through to the port", async () => {
        const recognize = vi.fn().mockResolvedValue({ text: "ok", confidence: 100 });
        const controller = new OcrController({ recognize });
        const signal = new AbortController().signal;

        await controller.recognize(new ArrayBuffer(4), "eng", signal);

        expect(recognize).toHaveBeenCalledWith({
            image: expect.any(ArrayBuffer),
            language: "eng",
            signal,
        });
    });

    it("rejects empty images before calling the port", async () => {
        const recognize = vi.fn();
        const controller = new OcrController({ recognize });

        await expect(controller.recognize(new ArrayBuffer(0), "eng")).rejects.toThrow("empty");
        expect(recognize).not.toHaveBeenCalled();
    });
});
