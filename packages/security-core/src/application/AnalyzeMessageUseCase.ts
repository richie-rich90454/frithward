import { ScamAnalysis } from "../domain/ScamAnalysis.js";
import { ScamPolicy } from "../domain/ScamPolicy.js";

// Complexity: O(n * p) over n characters and p patterns; single pass over input.
export class AnalyzeMessageUseCase {
    private readonly policy: ScamPolicy;
    private readonly patterns: readonly {
        id: string;
        label: string;
        pattern: RegExp;
        detail: string;
    }[];

    public constructor(policy?: ScamPolicy) {
        this.policy = policy ?? new ScamPolicy();
        this.patterns = [
            {
                id: "urgency",
                label: "Urgency pressure",
                pattern: /\b(urgent|immediately|act now|expires soon)\b/i,
                detail: "The message pressures you to act quickly.",
            },
            {
                id: "payment",
                label: "Payment request",
                pattern: /\b(pay|payment|invoice|wire transfer|gift card|bank transfer)\b/i,
                detail: "The message asks for a payment.",
            },
            {
                id: "credential",
                label: "Credential request",
                pattern: /\b(password|verify your account|log in|sign in)\b/i,
                detail: "The message asks for credentials.",
            },
            {
                id: "secrecy",
                label: "Secrecy request",
                pattern: /\b(do not tell|keep secret|confidential)\b/i,
                detail: "The message asks you to keep it secret.",
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
                detail: entry.detail,
                severity:
                    entry.id === "credential" || entry.id === "payment"
                        ? ("high" as const)
                        : ("medium" as const),
            }));
        return new ScamAnalysis(indicators);
    }
}
