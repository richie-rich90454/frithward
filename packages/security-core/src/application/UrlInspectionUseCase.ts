import { AppError } from "@frithward/contracts";
import type { UrlFinding, UrlInspectionResult, UrlRiskLevel } from "../domain/UrlInspection.js";

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

function dedupe(findings: readonly UrlFinding[]): UrlFinding[] {
    const seen = new Set<string>();
    return findings.filter((finding) => {
        if (seen.has(finding.id)) return false;
        seen.add(finding.id);
        return true;
    });
}

export class UrlInspectionUseCase {
    public execute(rawUrl: string): UrlInspectionResult {
        const original = rawUrl.trim();
        if (original.length === 0) throw new AppError("VALIDATION_FAILED", "URL required.");
        if (original.length > 2048)
            throw new AppError("VALIDATION_FAILED", "URL exceeds inspection limit.");

        const candidate = original.includes("://") ? original : `https://${original}`;
        let parsed: URL;
        try {
            parsed = new URL(candidate);
        } catch {
            return {
                original,
                normalizedUrl: null,
                hostname: null,
                riskLevel: "high",
                findings: [
                    {
                        id: "unparseable-url",
                        label: "Unreadable link",
                        detail: "The link could not be read as a web address.",
                        severity: "high",
                    },
                ],
                summary: "The link could not be read. Do not open it.",
                limitations: ["A malformed link cannot be checked against known patterns."],
            };
        }

        const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
        const labels = hostname.split(".");
        const findings: UrlFinding[] = [];
        const limitations: string[] = [
            "This check compares text patterns only; it cannot verify the actual website.",
            "Newly registered or unpublished domains may not be recognized.",
            "A legitimate-looking link can still host harmful content.",
        ];

        if (parsed.protocol === "http:") {
            findings.push({
                id: "insecure-transport",
                label: "Insecure connection",
                detail: "The link uses http, so the connection is not encrypted.",
                severity: "medium",
            });
        }
        if (parsed.username !== "" || parsed.password !== "") {
            findings.push({
                id: "embedded-credentials",
                label: "Hidden destination",
                detail: "The link contains credentials or an @ sign that can hide the real destination.",
                severity: "high",
            });
        }
        if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
            findings.push({
                id: "ip-host",
                label: "Numeric address",
                detail: "The link points to a numeric address instead of a named domain.",
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
            limitations.push("The hostname uses punycode and could not be decoded here.");
        }
        if (SHORTENERS.has(hostname)) {
            findings.push({
                id: "shortened-link",
                label: "Shortened link",
                detail: "The destination is hidden behind a short link.",
                severity: "medium",
            });
            limitations.push("The final destination is hidden behind a short link.");
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
            const separatorMatch =
                new RegExp(`(?:^|[.-])${escapeRegExp(brand)}(?:[.-]|$)`).test(registrable) ||
                new RegExp(`(?:^|[.-])${escapeRegExp(brand)}(?:[.-]|$)`).test(
                    normalizedRegistrable,
                );
            const inSubdomain = labels.slice(0, -2).some((label) => label.includes(brand));
            const close =
                levenshtein(nameLabel, brand) <= 1 ||
                levenshtein(normalizedRegistrable, brand) <= 1;
            if (startsWithBrand || separatorMatch || inSubdomain || close) {
                findings.push({
                    id: `brand-lookalike-${brand}`,
                    label: "Lookalike domain",
                    detail: `The domain resembles "${brand}" but is not the official domain.`,
                    severity: "high",
                });
            }
        }

        const riskLevel: UrlRiskLevel = findings.some((finding) => finding.severity === "high")
            ? "high"
            : findings.some((finding) => finding.severity === "medium")
              ? "medium"
              : "low";
        const summary =
            findings.length === 0
                ? "No obvious risk patterns found. This does not prove the link is safe."
                : `${findings.length} risk indicator(s) found. This does not establish fraud.`;

        return {
            original,
            normalizedUrl: parsed.toString(),
            hostname,
            riskLevel,
            findings: dedupe(findings),
            summary,
            limitations,
        };
    }
}
