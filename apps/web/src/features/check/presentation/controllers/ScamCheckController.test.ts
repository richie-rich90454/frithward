import { describe, expect, it, vi } from "vitest";
import {
    UrlInspectionUseCase,
    type QrInspectionResult,
    type ScamReport,
    type UrlInspectionResult,
} from "@frithward/security-core";
import { ScamCheckController } from "./ScamCheckController";
import type {
    RecentCheck,
    RecentCheckRepository,
} from "../../infrastructure/LocalStorageRecentCheckRepository";

function memoryRepository(): RecentCheckRepository {
    const entries: RecentCheck[] = [];
    return {
        list: () => entries,
        save: (entry) => {
            entries.unshift(entry);
        },
    };
}

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

describe("ScamCheckController report generation", () => {
    const report: ScamReport = {
        id: "report-1",
        channel: "message",
        description: "send your password urgently",
        source: "Local scam check",
        evidenceSha256: "a".repeat(64),
        reportedAt: "2026-01-01T00:00:00.000Z",
        status: "open",
    };

    it("generates a typed report from the checked message", async () => {
        const execute = vi.fn(async () => report);
        const controller = new ScamCheckController({ reportUseCase: { execute } });
        controller.check("send your password urgently");
        await expect(controller.generateReport()).resolves.toEqual(report);
        expect(execute).toHaveBeenCalledWith({
            channel: "message",
            description: "send your password urgently",
            source: "Local scam check",
        });
        expect(controller.getError()).toBeNull();
    });

    it("does not fabricate a report before a message is checked", async () => {
        const execute = vi.fn(async () => report);
        const controller = new ScamCheckController({ reportUseCase: { execute } });
        await expect(controller.generateReport()).resolves.toBeNull();
        expect(execute).not.toHaveBeenCalled();
        expect(controller.getError()).toContain("Check a message");
    });

    it("surfaces report errors without returning a report", async () => {
        const controller = new ScamCheckController({
            reportUseCase: {
                execute: async () => {
                    throw new Error("Report description required.");
                },
            },
        });
        controller.check("hello");
        await expect(controller.generateReport()).resolves.toBeNull();
        expect(controller.getError()).toBe("Report description required.");
    });
});

describe("ScamCheckController second-pass enrichment", () => {
    it("adds a separately labelled heuristic pass for realistic scam text", () => {
        const controller = new ScamCheckController({ recentChecks: memoryRepository() });
        controller.check("URGENT: pay the invoice now or buy a gift card immediately.");
        const ids = controller.getReviewedFindings().map((finding) => finding.id);
        expect(ids).toContain("reviewed-urgency");
        expect(ids).toContain("reviewed-payment");
        expect(ids).toContain("reviewed-gift-card");
        for (const finding of controller.getReviewedFindings()) {
            expect(finding.rationale.length).toBeGreaterThan(0);
        }
    });

    it("adds nothing for a benign message and makes no certainty claim", () => {
        const controller = new ScamCheckController({ recentChecks: memoryRepository() });
        controller.check("Lunch is at noon. See you there!");
        expect(controller.getReviewedFindings()).toEqual([]);
        const result = controller.getLastResult();
        expect(result?.limitations.join(" ").toLowerCase()).toContain("not proof of fraud");
        expect(result?.limitations.join(" ").toLowerCase()).not.toContain("confirmed");
    });

    it("keeps the secondary pass separate from the core analysis indicators", () => {
        const controller = new ScamCheckController({ recentChecks: memoryRepository() });
        controller.check("send your password urgently");
        const coreIds = controller.getAnalysis()?.indicators.map((item) => item.id) ?? [];
        const reviewedIds = controller.getReviewedFindings().map((item) => item.id);
        expect(coreIds).not.toEqual(reviewedIds);
        expect(coreIds.some((id) => id.startsWith("reviewed-"))).toBe(false);
    });
});

describe("ScamCheckController persistence", () => {
    it("exposes the last result for later Case-store wiring", () => {
        const controller = new ScamCheckController({ recentChecks: memoryRepository() });
        controller.check("URGENT pay the invoice");
        const result = controller.getLastResult();
        expect(result).toMatchObject({ channel: "message", input: "URGENT pay the invoice" });
        expect(result?.analysis).not.toBeNull();
        expect(result?.reviewedFindings.length).toBeGreaterThan(0);
        expect(result?.createdAt).toBeTruthy();
    });

    it("saves each check to the recent-checks list", () => {
        const repository = memoryRepository();
        const controller = new ScamCheckController({ recentChecks: repository });
        controller.check("hello there");
        controller.checkUrl("example.com");
        expect(controller.getRecentChecks().map((item) => item.channel)).toEqual([
            "url",
            "message",
        ]);
        expect(repository.list()[0]?.input).toBe("example.com");
    });

    it("does not record a result when a check fails", () => {
        const controller = new ScamCheckController({
            recentChecks: memoryRepository(),
            urlInspector: {
                execute: () => {
                    throw new Error("URL required.");
                },
            },
        });
        controller.checkUrl("");
        expect(controller.getLastResult()).toBeNull();
        expect(controller.getRecentChecks()).toEqual([]);
        expect(controller.getError()).toBe("URL required.");
    });
});

describe("ScamCheckController translated presentation", () => {
    it("translates the URL TLD and brand details using their emitted params", () => {
        const t = (key: string) => {
            const values: Record<string, string> = {
                "result.URL_TLD_DETAIL": "Dominio terminado en .{tld}",
                "result.URL_BRAND_DETAIL": 'Parece "{brand}" pero no es el sitio oficial.',
            };
            return values[key] ?? key;
        };
        const controller = new ScamCheckController({
            translate: t,
            urlInspector: { execute: (url) => new UrlInspectionUseCase().execute(url) },
            recentChecks: memoryRepository(),
        });
        controller.checkUrl("https://paypa1.xyz");
        const details = controller.getUrlView()?.findings.map((finding) => finding.detail) ?? [];
        expect(details).toContain("Dominio terminado en .xyz");
        expect(details).toContain('Parece "paypal" pero no es el sitio oficial.');
    });

    it("translates analysis next steps and guided step text", () => {
        const t = (key: string) => {
            const values: Record<string, string> = {
                "result.SCAM_NEXT_CONTACT_KNOWN": "Confirma por un canal conocido.",
                "result.SCAM_NEXT_NO_SEND": "No envíes dinero.",
                "result.SCAM_NEXT_KEEP_EVIDENCE": "Guarda el mensaje.",
                "result.GUIDED_PAUSE_TITLE": "Detente",
                "result.GUIDED_PAUSE_PLAIN": "No respondas ahora.",
                "result.GUIDED_PAUSE_ACTION": "Suelta el teléfono.",
            };
            return values[key] ?? key;
        };
        const controller = new ScamCheckController({
            translate: t,
            recentChecks: memoryRepository(),
        });
        controller.check("URGENT: send your password");
        expect(controller.getAnalysis()?.nextSteps).toEqual([
            "Confirma por un canal conocido.",
            "No envíes dinero.",
            "Guarda el mensaje.",
        ]);
        expect(controller.getGuidedStep().title).toBe("Detente");
        expect(controller.getGuidedStep().plainLanguage).toBe("No respondas ahora.");
        expect(controller.getGuidedStep().action).toBe("Suelta el teléfono.");
    });

    it("translates surfaced AppError messages", () => {
        const t = (key: string) => (key === "error.URL_REQUIRED" ? "Falta la URL." : key);
        const controller = new ScamCheckController({
            translate: t,
            urlInspector: { execute: () => new UrlInspectionUseCase().execute("") },
            recentChecks: memoryRepository(),
        });
        controller.checkUrl("");
        expect(controller.getError()).toBe("Falta la URL.");
    });
});
