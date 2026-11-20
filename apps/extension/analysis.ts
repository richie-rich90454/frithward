/**
 * LOCAL HEURISTIC CATALOG.
 *
 * `@frithward/security-core` is NOT a dependency of this extension (see package.json),
 * so this file mirrors the reviewed, transparent rule style of the web app's engine
 * instead of importing it. Text patterns are kept identical to AnalyzeMessageUseCase
 * and the URL host heuristics follow UrlInspectionUseCase. No verdict is produced.
 */

export type Severity = "low" | "medium" | "high";

export interface Finding {
    id: string;
    label: string;
    detail: string;
    severity: Severity;
}

export interface AnalysisResult {
    summary: string;
    findings: readonly Finding[];
    nextSteps: readonly string[];
    limitations: readonly string[];
}

const TEXT_PATTERNS: readonly {
    id: string;
    label: string;
    pattern: RegExp;
    detail: string;
    severity: Severity;
}[] = [
    {
        id: "urgency",
        label: "Urgency pressure",
        pattern: /\b(urgent|immediately|act now|expires soon)\b/i,
        detail: "The text pressures you to act quickly.",
        severity: "medium",
    },
    {
        id: "payment",
        label: "Payment request",
        pattern: /\b(pay|payment|invoice|wire transfer|gift card|bank transfer)\b/i,
        detail: "The text asks for a payment.",
        severity: "high",
    },
    {
        id: "credential",
        label: "Credential request",
        pattern: /\b(password|verify your account|log in|sign in)\b/i,
        detail: "The text asks for credentials.",
        severity: "high",
    },
    {
        id: "secrecy",
        label: "Secrecy request",
        pattern: /\b(do not tell|keep secret|confidential)\b/i,
        detail: "The text asks you to keep it secret.",
        severity: "medium",
    },
];

const BRAND_NAMES = [
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
    "binance",
    "metamask",
    "chase",
    "wellsfargo",
    "bankofamerica",
    "citibank",
    "irs",
    "dhl",
    "fedex",
    "ups",
] as const;

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
    "rest",
    "quest",
    "monster",
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
    "shorturl.at",
]);

const SECOND_LEVEL_DOMAINS = new Set([
    "co",
    "com",
    "org",
    "net",
    "gov",
    "ac",
    "edu",
    "or",
    "ne",
    "go",
]);

const HOMOGLYPHS: Readonly<Record<string, string>> = {
    "0": "o",
    "1": "l",
    i: "l",
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

function normalizeHomoglyphs(value: string): string {
    return value
        .toLowerCase()
        .split("")
        .map((character) => HOMOGLYPHS[character] ?? character)
        .join("");
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function registrableDomain(labels: readonly string[]): string {
    const secondToLast = labels[labels.length - 2] ?? "";
    if (labels.length >= 3 && SECOND_LEVEL_DOMAINS.has(secondToLast)) {
        return labels.slice(-3).join(".");
    }
    return labels.slice(-2).join(".");
}

function dedupe(findings: readonly Finding[]): Finding[] {
    const seen = new Set<string>();
    return findings.filter((finding) => {
        if (seen.has(finding.id)) return false;
        seen.add(finding.id);
        return true;
    });
}

function inspectUrl(rawUrl: string): Finding[] {
    const original = rawUrl.trim();
    if (original === "") return [];

    const candidate = original.includes("://") ? original : `https://${original}`;
    let parsed: URL;
    try {
        parsed = new URL(candidate);
    } catch {
        return [
            {
                id: "unparseable-url",
                label: "Unreadable address",
                detail: "The address could not be read as a web address.",
                severity: "high",
            },
        ];
    }

    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    const labels = hostname.split(".");
    const findings: Finding[] = [];

    if (parsed.protocol === "http:") {
        findings.push({
            id: "insecure-transport",
            label: "Insecure connection",
            detail: "The address uses http, so the connection is not encrypted.",
            severity: "medium",
        });
    }
    if (parsed.username !== "" || parsed.password !== "") {
        findings.push({
            id: "embedded-credentials",
            label: "Hidden destination",
            detail: "The address contains credentials that can hide the real destination.",
            severity: "high",
        });
    }
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
        findings.push({
            id: "ip-host",
            label: "Numeric address",
            detail: "The address points to a numeric address instead of a named domain.",
            severity: "medium",
        });
    }
    if (hostname.includes("xn--")) {
        findings.push({
            id: "punycode-host",
            label: "Encoded hostname",
            detail: "The hostname uses punycode, which can hide lookalike characters.",
            severity: "medium",
        });
    }
    if (SHORTENERS.has(hostname)) {
        findings.push({
            id: "shortened-link",
            label: "Shortened link",
            detail: "The destination is hidden behind a short link.",
            severity: "medium",
        });
    }

    const tld = labels[labels.length - 1] ?? "";
    if (SUSPICIOUS_TLDS.has(tld)) {
        findings.push({
            id: "suspicious-tld",
            label: "Uncommon domain ending",
            detail: `The domain ending .${tld} is frequently used for throwaway sites.`,
            severity: "medium",
        });
    }
    if (labels.length >= 4) {
        findings.push({
            id: "deep-subdomain",
            label: "Many subdomains",
            detail: "The address has an unusually deep subdomain chain.",
            severity: "low",
        });
    }
    if ((hostname.match(/-/g)?.length ?? 0) >= 3) {
        findings.push({
            id: "many-hyphens",
            label: "Many hyphens",
            detail: "The address contains several hyphens, a common lookalike trick.",
            severity: "low",
        });
    }

    const registrable = registrableDomain(labels);
    const normalizedRegistrable = normalizeHomoglyphs(registrable);
    const nameLabel = registrable.split(".")[0] ?? "";
    for (const brand of BRAND_NAMES) {
        if (registrable === brand || registrable.startsWith(`${brand}.`)) continue;
        const startsWithBrand =
            registrable.startsWith(brand) || normalizedRegistrable.startsWith(brand);
        const separatorMatch = new RegExp(`(?:^|[.-])${escapeRegExp(brand)}(?:[.-]|$)`).test(
            normalizedRegistrable,
        );
        const inSubdomain = labels.slice(0, -2).some((label) => label.includes(brand));
        const close =
            levenshtein(nameLabel, brand) <= 1 || levenshtein(normalizedRegistrable, brand) <= 1;
        if (startsWithBrand || separatorMatch || inSubdomain || close) {
            findings.push({
                id: `brand-lookalike-${brand}`,
                label: "Lookalike domain",
                detail: `The domain resembles "${brand}" but is not the official domain.`,
                severity: "high",
            });
        }
    }

    return dedupe(findings);
}

/** Analyze locally captured text and the page host. Produces indicators, never a verdict. */
export function analyze(text: string, url: string): AnalysisResult {
    const findings: Finding[] = [];
    for (const entry of TEXT_PATTERNS) {
        if (entry.pattern.test(text)) {
            findings.push({
                id: entry.id,
                label: entry.label,
                detail: entry.detail,
                severity: entry.severity,
            });
        }
    }
    findings.push(...inspectUrl(url));
    const unique = dedupe(findings);

    return {
        summary: unique.length
            ? `${unique.length} risk indicator(s) found. This does not establish fraud.`
            : "No risk indicators found in the text or address. This does not prove the page is safe.",
        findings: unique,
        nextSteps: [
            "Contact the person or organisation through a known channel to confirm the request.",
            "Do not send money, codes, or credentials based on this page alone.",
            "Keep the original page as evidence if something feels wrong.",
        ],
        limitations: [
            "Text and address patterns alone cannot prove intent or establish fraud.",
            "Only the first 20,000 characters of page text were analyzed.",
            "Related links, images, scripts, and callers were not checked.",
            "A legitimate page can still contain these words in an innocent context.",
            "Newly registered or unpublished domains may not be recognized.",
        ],
    };
}
