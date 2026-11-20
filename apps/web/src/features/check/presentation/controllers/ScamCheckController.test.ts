import { describe, expect, it, vi } from "vitest";
import type { QrInspectionResult, UrlInspectionResult } from "@frithward/security-core";
import { ScamCheckController } from "./ScamCheckController";

const urlResult: UrlInspectionResult = {
    original: "paypa1.example",
    normalizedUrl: "https://paypa1.example/",
    hostname: "paypa1.example",
    riskLevel: "high",
    findings: [
        {
            id: "brand-lookalike-paypal",
            label: "Lookalike domain",
            detail: 'The domain resembles "paypal" but is not the official domain.',
            severity: "high",
        },
    ],
    summary: "1 risk indicator(s) found. This does not establish fraud.",
    limitations: ["This check compares text patterns only; it cannot verify the actual website."],
};

const qrResult: QrInspectionResult = {
    payload: "WIFI:S:guest;P:secret;;",
    payloadKind: "wifi",
    riskLevel: "medium",
    findings: [
        {
            id: "wifi-credentials",
            label: "Wi-Fi configuration",
            detail: "The code contains Wi-Fi settings.",
            severity: "medium",
        },
    ],
    summary: "1 risk indicator(s) found. This does not establish intent.",
    limitations: ["A QR code can point anywhere; the payload may be truncated or encoded."],
};

describe("ScamCheckController URL inspection", () => {
    it("maps the use-case result into a typed view model", () => {
        const execute = vi.fn(() => urlResult);
        const controller = new ScamCheckController({ urlInspector: { execute } });
        controller.checkUrl("  paypa1.example ");
        expect(execute).toHaveBeenCalledWith("  paypa1.example ");
        expect(controller.getUrlView()).toEqual(urlResult);
        expect(controller.getError()).toBeNull();
    });

    it("keeps limitations visible and surfaces use-case errors", () => {
        const controller = new ScamCheckController({
            urlInspector: { execute: () => urlResult },
        });
        controller.checkUrl("paypa1.example");
        expect(controller.getUrlView()?.limitations.length).toBeGreaterThan(0);

        const failing = new ScamCheckController({
            urlInspector: {
                execute: () => {
                    throw new Error("URL required.");
                },
            },
        });
        failing.checkUrl("");
        expect(failing.getUrlView()).toBeNull();
        expect(failing.getError()).toBe("URL required.");
    });
});

describe("ScamCheckController QR inspection", () => {
    it("maps QR findings and feeds them into the guided flow", () => {
        const execute = vi.fn(() => qrResult);
        const controller = new ScamCheckController({ qrInspector: { execute } });
        controller.checkQr("WIFI:S:guest;P:secret;;");
        expect(execute).toHaveBeenCalledOnce();
        expect(controller.getQrView()).toEqual(qrResult);
        expect(controller.getGuidedStep().id).toBe("pause");
        const reviewStep = controller.getGuidedSteps()[1];
        expect(reviewStep?.plainLanguage).toContain("Wi-Fi configuration");
        controller.guidedNext();
        expect(controller.getGuidedIndex()).toBe(1);
        controller.guidedComplete();
        expect(controller.getGuidedSteps()[1]?.completed).toBe(true);
    });

    it("reports QR errors without fabricating a result", () => {
        const controller = new ScamCheckController({
            qrInspector: {
                execute: () => {
                    throw new Error("QR payload required.");
                },
            },
        });
        controller.checkQr("");
        expect(controller.getQrView()).toBeNull();
        expect(controller.getError()).toBe("QR payload required.");
    });
});
