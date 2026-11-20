import { describe, expect, it } from "vitest";
import { translateMediaAnalysisText } from "./mapMediaAnalysis.js";
import { english } from "./translate.js";

describe("translateMediaAnalysisText", () => {
    const result = {
        summary: "Protection applied on an experimental basis using voice-seal. This does not guarantee prevention of misuse.",
        summaryCode: "PROTECTION_SUMMARY_APPLIED",
        summaryParams: { method: "voice-seal" },
        limitations: ["Protection is experimental and does not guarantee prevention of misuse."],
        limitationCodes: ["PROTECTION_LIMIT_EXPERIMENTAL"],
        nextSteps: [
            "Keep the original and protected artifacts together.",
            "Re-evaluate protection after any model or policy update.",
        ],
        nextStepCodes: ["PROTECTION_NEXT_KEEP_ARTIFACTS", "PROTECTION_NEXT_REEVALUATE"],
    };

    it("keeps the English text as fallback", () => {
        expect(translateMediaAnalysisText(english, result)).toEqual({
            summary: result.summary,
            limitations: result.limitations,
            nextSteps: result.nextSteps,
        });
    });

    it("translates summary, limitations and next steps by their codes", () => {
        const t = (key: string) => {
            const values: Record<string, string> = {
                "result.PROTECTION_SUMMARY_APPLIED": "Protegido con {method}.",
                "result.PROTECTION_LIMIT_EXPERIMENTAL": "Protección experimental.",
                "result.PROTECTION_NEXT_KEEP_ARTIFACTS": "Conserva ambos archivos.",
                "result.PROTECTION_NEXT_REEVALUATE": "Reevalúa la protección.",
            };
            return values[key] ?? key;
        };
        expect(translateMediaAnalysisText(t, result)).toEqual({
            summary: "Protegido con voice-seal.",
            limitations: ["Protección experimental."],
            nextSteps: ["Conserva ambos archivos.", "Reevalúa la protección."],
        });
    });
});
