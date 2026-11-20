import { ScamAnalysis } from "../domain/ScamAnalysis.js";
import { ScamPolicy } from "../domain/ScamPolicy.js";

// Complexity: O(n * p) over n characters and p patterns; single pass over input.
export class AnalyzeMessageUseCase {
    private readonly policy: ScamPolicy;
    private readonly patterns: readonly {
        id: string;
        label: string;
        labelCode: string;
        pattern: RegExp;
        detail: string;
        detailCode: string;
    }[];

    public constructor(policy?: ScamPolicy) {
        this.policy = policy ?? new ScamPolicy();
        this.patterns = [
            {
                id: "urgency",
                label: "Urgency pressure",
                labelCode: "SCAM_INDICATOR_URGENCY_LABEL",
                pattern: /\b(urgent|immediately|act now|expires soon)\b/i,
                detail: "The message pressures you to act quickly.",
                detailCode: "SCAM_INDICATOR_URGENCY_DETAIL",
            },
            {
                id: "payment",
                label: "Payment request",
                labelCode: "SCAM_INDICATOR_PAYMENT_LABEL",
                pattern: /\b(pay|payment|invoice|wire transfer|gift card|bank transfer)\b/i,
                detail: "The message asks for a payment.",
                detailCode: "SCAM_INDICATOR_PAYMENT_DETAIL",
            },
            {
                id: "credential",
                label: "Credential request",
                labelCode: "SCAM_INDICATOR_CREDENTIAL_LABEL",
                pattern: /\b(password|verify your account|log in|sign in)\b/i,
                detail: "The message asks for credentials.",
                detailCode: "SCAM_INDICATOR_CREDENTIAL_DETAIL",
            },
            {
                id: "secrecy",
                label: "Secrecy request",
                labelCode: "SCAM_INDICATOR_SECRECY_LABEL",
                pattern: /\b(do not tell|keep secret|confidential)\b/i,
                detail: "The message asks you to keep it secret.",
                detailCode: "SCAM_INDICATOR_SECRECY_DETAIL",
            },
        ];
    }

    public execute(text: string): ScamAnalysis {
        this.policy.assertTextWithinLimits(text);
        const indicators = this.patterns
            .filter((entry) => entry.pattern.test(text))
            .map((entry) => ({
                id: entry.id,
                label: entry.label,
                labelCode: entry.labelCode,
                detail: entry.detail,
                detailCode: entry.detailCode,
                severity:
                    entry.id === "credential" || entry.id === "payment"
                        ? ("high" as const)
                        : ("medium" as const),
            }));
        return new ScamAnalysis(indicators);
    }
}
