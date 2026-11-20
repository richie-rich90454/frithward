/**
 * A reviewed catalog of transparent, rule-based scam-check heuristics.
 *
 * This is a SECOND PASS only. It does not replace the analysis in
 * @frithward/security-core, it is not machine learning, and a match is a signal
 * to look closer - never proof of fraud or of a person's intent.
 */

export type ReviewedSeverity = "low" | "medium" | "high";

export interface ReviewedLink {
    display: string;
    target: string;
}

export interface ReviewedInput {
    text: string;
    links: readonly ReviewedLink[];
    urls: readonly string[];
}

export interface ReviewedPattern {
    id: string;
    label: string;
    rationale: string;
    detail: string;
    severity: ReviewedSeverity;
    matches: (input: ReviewedInput) => boolean;
}

export interface ReviewedMatch {
    id: string;
    label: string;
    rationale: string;
    detail: string;
    severity: ReviewedSeverity;
}

const BRANDS = [
    "paypal",
    "apple",
    "microsoft",
    "google",
    "amazon",
    "netflix",
    "instagram",
    "facebook",
    "whatsapp",
    "coinbase",
    "chase",
    "wellsfargo",
    "bankofamerica",
    "irs",
    "dhl",
    "fedex",
    "ups",
] as const;

const HOMOGLYPHS: Readonly<Record<string, string>> = {
    "0": "o",
    "1": "l",
    "|": "l",
    "5": "s",
    "2": "z",
    "8": "b",
    "@": "a",
    $: "s",
    "7": "t",
    "4": "a",
    "6": "g",
    "9": "g",
    "3": "e",
};

const SUSPICIOUS_TLDS = new Set([
    "xyz",
    "top",
    "click",
    "loan",
    "work",
    "date",
    "racing",
    "win",
    "bid",
    "stream",
    "cam",
    "gq",
    "cf",
    "tk",
    "ml",
    "ga",
    "country",
    "download",
]);

const SHORTENERS = new Set([
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "cutt.ly",
    "rb.gy",
]);

const MULTI_PART_SUFFIXES = new Set([
    "co.uk",
    "org.uk",
    "com.au",
    "co.nz",
    "co.jp",
    "com.br",
    "co.in",
    "co.za",
]);

const HAS_TEXT = (re: RegExp) => (input: ReviewedInput) => re.test(input.text);

function normalize(value: string): string {
    return value
        .toLowerCase()
        .split("")
        .map((character) => HOMOGLYPHS[character] ?? character)
        .join("")
        .replaceAll("rn", "m");
}

function levenshtein(a: string, b: string): number {
    const row: number[] = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
        let diagonal = row[0] ?? 0;
        row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const above = row[j] ?? 0;
            const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
            row[j] = Math.min(above + 1, (row[j - 1] ?? 0) + 1, diagonal + cost);
            diagonal = above;
        }
    }
    return row[b.length] ?? 0;
}

export function hostnameOf(raw: string): string | null {
    const value = raw.trim();
    if (value.length === 0) return null;
    try {
        const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
        const hostname = new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
        return hostname.includes(".") ? hostname : null;
    } catch {
        return null;
    }
}

/** Registrable domain with a small common-suffix list, not the full public suffix list. */
export function registrableOf(hostname: string): string | null {
    const labels = hostname.split(".");
    if (labels.length < 2) return null;
    const lastTwo = labels.slice(-2).join(".");
    if (MULTI_PART_SUFFIXES.has(lastTwo) && labels.length >= 3) {
        return labels.slice(-3).join(".");
    }
    return lastTwo;
}

function withHosts(input: ReviewedInput): string[] {
    const hosts: string[] = [];
    for (const url of input.urls) {
        const hostname = hostnameOf(url);
        if (hostname) hosts.push(hostname);
    }
    for (const link of input.links) {
        const hostname = hostnameOf(link.target);
        if (hostname) hosts.push(hostname);
    }
    return [...new Set(hosts)];
}

function hasLookalikeHost(input: ReviewedInput): boolean {
    return withHosts(input).some((hostname) => {
        const registrable = registrableOf(hostname);
        if (!registrable) return false;
        const name = registrable.split(".")[0] ?? "";
        const normalized = normalize(name);
        return BRANDS.some(
            (brand) =>
                name !== brand &&
                (normalized === brand ||
                    normalized.startsWith(brand) ||
                    normalized.endsWith(brand) ||
                    levenshtein(name, brand) <= 1),
        );
    });
}

function hasMismatchedLink(input: ReviewedInput): boolean {
    return input.links.some((link) => {
        const shown = registrableOf(hostnameOf(link.display) ?? "");
        const target = registrableOf(hostnameOf(link.target) ?? "");
        return shown !== null && target !== null && shown !== target;
    });
}

function hasIpHost(input: ReviewedInput): boolean {
    return withHosts(input).some((hostname) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname));
}

function hasEmbeddedCredentials(input: ReviewedInput): boolean {
    return [...input.urls, ...input.links.map((link) => link.target)].some((url) => {
        try {
            const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`);
            return parsed.username !== "" || parsed.password !== "";
        } catch {
            return false;
        }
    });
}

function hasShortenedLink(input: ReviewedInput): boolean {
    return withHosts(input).some((hostname) => SHORTENERS.has(hostname));
}

function hasPunycodeHost(input: ReviewedInput): boolean {
    return withHosts(input).some((hostname) => hostname.includes("xn--"));
}

function hasSuspiciousTld(input: ReviewedInput): boolean {
    return withHosts(input).some((hostname) => {
        const tld = hostname.split(".").pop() ?? "";
        return SUSPICIOUS_TLDS.has(tld);
    });
}

export const REVIEWED_PATTERNS: readonly ReviewedPattern[] = [
    {
        id: "reviewed-urgency",
        label: "Urgency pressure",
        rationale: "Time pressure can push a person to act before checking the request.",
        detail: "The text uses wording that pushes for an immediate response.",
        severity: "medium",
        matches: HAS_TEXT(
            /\b(urgent(?:ly)?|immediately|act now|asap|right away|expires? (?:soon|today)|limited time|final notice|last chance)\b/i,
        ),
    },
    {
        id: "reviewed-payment",
        label: "Payment request",
        rationale: "An unexpected request for money is worth confirming through a known channel.",
        detail: "The text mentions sending money or paying an invoice.",
        severity: "high",
        matches: HAS_TEXT(
            /\b(pay|payment|invoice|wire transfer|bank transfer|send (?:the )?money|transfer (?:the )?funds)\b/i,
        ),
    },
    {
        id: "reviewed-gift-card",
        label: "Gift-card demand",
        rationale: "Gift cards and prepaid vouchers are a common way to move money irreversibly.",
        detail: "The text asks for a gift card, prepaid card, or redemption code.",
        severity: "high",
        matches: HAS_TEXT(
            /\b(gift\s?cards?|prepaid cards?|voucher codes?|steam cards?|itunes cards?|redeem codes?)\b/i,
        ),
    },
    {
        id: "reviewed-credential",
        label: "Credential request",
        rationale: "Passwords and one-time codes give access to an account if shared.",
        detail: "The text asks for a password, code, or account sign-in.",
        severity: "high",
        matches: HAS_TEXT(
            /\b(passwords?|verify your account|one[- ]time (?:code|passcode)|verification codes?|log ?in|sign ?in|pin codes?)\b/i,
        ),
    },
    {
        id: "reviewed-secrecy",
        label: "Secrecy request",
        rationale:
            "Being asked to hide a request from family or colleagues reduces outside checks.",
        detail: "The text asks you to keep the request secret.",
        severity: "medium",
        matches: HAS_TEXT(
            /\b(do not tell|do not inform|keep (?:this )?(?:secret|confidential)|between us|confidential)\b/i,
        ),
    },
    {
        id: "reviewed-generic-greeting",
        label: "Generic greeting",
        rationale:
            "A generic salutation is common in bulk messages; spelling and grammar quality are not used as signals.",
        detail: "The text opens with a broad, impersonal greeting or call to action.",
        severity: "low",
        matches: HAS_TEXT(
            /\b(dear (?:customer|user|member|beneficiary|friend)|valued (?:customer|member)|click here|verify now)\b/i,
        ),
    },
    {
        id: "reviewed-crypto",
        label: "Cryptocurrency request",
        rationale:
            "Crypto transfers are usually irreversible, so the request deserves a second look.",
        detail: "The text mentions cryptocurrency or a wallet address.",
        severity: "medium",
        matches: HAS_TEXT(
            /\b(bitcoin|btc|ethereum|crypto(?:currency)?|wallet address|usdt|tether)\b/i,
        ),
    },
    {
        id: "reviewed-mismatched-link",
        label: "Mismatched link",
        rationale:
            "A link whose shown domain differs from its real destination can hide where it goes.",
        detail: "The link text shows a different domain from the link target.",
        severity: "high",
        matches: hasMismatchedLink,
    },
    {
        id: "reviewed-lookalike-domain",
        label: "Lookalike domain",
        rationale:
            "Names that resemble a known brand, including lookalike characters such as 0 for o, are a common deception hint.",
        detail: "A domain resembles a well-known brand but is not that brand's exact name.",
        severity: "high",
        matches: hasLookalikeHost,
    },
    {
        id: "reviewed-ip-host",
        label: "Numeric address",
        rationale: "A numeric address gives no readable organisation name to verify.",
        detail: "A link points to a numeric IP address rather than a named domain.",
        severity: "medium",
        matches: hasIpHost,
    },
    {
        id: "reviewed-embedded-credentials",
        label: "Hidden destination",
        rationale: "An @ sign with credentials can make the real destination hard to see.",
        detail: "A link contains an embedded username or password.",
        severity: "high",
        matches: hasEmbeddedCredentials,
    },
    {
        id: "reviewed-shortened-link",
        label: "Shortened link",
        rationale: "A short link hides the final destination from the reader.",
        detail: "A link uses a URL shortener.",
        severity: "low",
        matches: hasShortenedLink,
    },
    {
        id: "reviewed-punycode-host",
        label: "Encoded hostname",
        rationale:
            "Punycode can represent lookalike characters that are hard to spot in the address bar.",
        detail: "A link uses an encoded (punycode) hostname.",
        severity: "medium",
        matches: hasPunycodeHost,
    },
    {
        id: "reviewed-suspicious-tld",
        label: "Uncommon domain ending",
        rationale:
            "An uncommon domain ending is only reported alongside another signal, because on its own it is weak evidence.",
        detail: "A domain ending is uncommon and another risk signal is also present.",
        severity: "low",
        matches: hasSuspiciousTld,
    },
];

export const REVIEWED_LIMITATIONS: readonly string[] = [
    "This is a transparent rule-based pass, not machine learning or a prediction of intent.",
    "A match is a prompt to check with the sender through a known channel; it is not proof of fraud.",
    "No match does not mean the message or link is safe.",
    "Grammar and spelling quality are not used as signals.",
    "The word lists cover common English phrasing only and may miss unusual wording.",
    "Domains are compared with a small suffix list and cannot verify the real website.",
];

const SUSPICIOUS_RULE_ID = "reviewed-suspicious-tld";

/** Returns only patterns that actually matched; the uncommon-TLD rule needs another signal first. */
export function findReviewedPatterns(input: ReviewedInput): readonly ReviewedMatch[] {
    const standalone = REVIEWED_PATTERNS.filter(
        (pattern) => pattern.id !== SUSPICIOUS_RULE_ID && pattern.matches(input),
    );
    const suspicious = REVIEWED_PATTERNS.find((pattern) => pattern.id === SUSPICIOUS_RULE_ID);
    const matched =
        suspicious && standalone.length > 0 && suspicious.matches(input)
            ? [...standalone, suspicious]
            : standalone;
    return matched.map((pattern) => ({
        id: pattern.id,
        label: pattern.label,
        rationale: pattern.rationale,
        detail: pattern.detail,
        severity: pattern.severity,
    }));
}

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^\s)]+)\)/g;
const HTML_ANCHOR = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const SCHEMED_URL = /(?:https?:\/\/)[^\s<>"']+/gi;
const BARE_URL = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi;

/** Extracts links and bare addresses from message text for the second pass. */
export function buildReviewedInput(text: string): ReviewedInput {
    const links: ReviewedLink[] = [];
    const urls: string[] = [];

    for (const match of text.matchAll(SCHEMED_URL)) urls.push(match[0]);

    for (const match of text.matchAll(MARKDOWN_LINK)) {
        links.push({ display: match[1] ?? "", target: match[2] ?? "" });
        urls.push(match[2] ?? "");
    }
    for (const match of text.matchAll(HTML_ANCHOR)) {
        links.push({
            display: (match[2] ?? "").replace(/<[^>]*>/g, "").trim(),
            target: match[1] ?? "",
        });
        urls.push(match[1] ?? "");
    }
    for (const match of text.matchAll(BARE_URL)) urls.push(match[0]);

    return { text, links, urls: [...new Set(urls)] };
}
