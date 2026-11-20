import type { ReviewedMatch } from "../domain/ReviewedPatterns.js";
import { REVIEWED_LIMITATIONS } from "../domain/ReviewedPatterns.js";

export type Translator = (key: string) => string;

const SLUGS: Readonly<Record<string, string>> = {
    "reviewed-urgency": "urgency",
    "reviewed-payment": "payment",
    "reviewed-gift-card": "giftCard",
    "reviewed-credential": "credential",
    "reviewed-secrecy": "secrecy",
    "reviewed-generic-greeting": "genericGreeting",
    "reviewed-crypto": "crypto",
    "reviewed-mismatched-link": "mismatchedLink",
    "reviewed-lookalike-domain": "lookalikeDomain",
    "reviewed-ip-host": "ipHost",
    "reviewed-embedded-credentials": "embeddedCredentials",
    "reviewed-shortened-link": "shortenedLink",
    "reviewed-punycode-host": "punycodeHost",
    "reviewed-suspicious-tld": "suspiciousTld",
};

function slugFor(id: string): string | null {
    return SLUGS[id] ?? null;
}

function translated(t: Translator, key: string, fallback: string): string {
    const value = t(key);
    return value === key || value === "" ? fallback : value;
}

export interface TranslatedPattern {
    label: string;
    rationale: string;
    detail: string;
}

export function translatePatternFields(
    t: Translator,
    id: string,
    fallback: TranslatedPattern,
): TranslatedPattern {
    const slug = slugFor(id);
    if (!slug) return fallback;
    return {
        label: translated(t, `patterns.${slug}.label`, fallback.label),
        rationale: translated(t, `patterns.${slug}.rationale`, fallback.rationale),
        detail: translated(t, `patterns.${slug}.detail`, fallback.detail),
    };
}

export function translateReviewedMatch(t: Translator, match: ReviewedMatch): TranslatedPattern {
    return translatePatternFields(t, match.id, {
        label: match.label,
        rationale: match.rationale,
        detail: match.detail,
    });
}

export function translateReviewedLimitations(t: Translator): readonly string[] {
    return REVIEWED_LIMITATIONS.map((fallback, index) =>
        translated(t, `patterns.limitation.${index}`, fallback),
    );
}
