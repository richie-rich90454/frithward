import { AppError } from "@frithward/contracts";
import type { UrlRiskLevel } from "../domain/UrlInspection.js";
import { UrlInspectionUseCase } from "./UrlInspectionUseCase.js";

export type QrPayloadKind = "url" | "wifi" | "vcard" | "crypto" | "contact" | "text" | "unknown";

export interface QrFinding {
    id: string;
    label: string;
    detail: string;
    severity: UrlRiskLevel;
}

export interface QrInspectionResult {
    payload: string;
    payloadKind: QrPayloadKind;
    riskLevel: UrlRiskLevel;
    findings: readonly QrFinding[];
    summary: string;
    limitations: readonly string[];
}

const CRYPTO_PATTERN =
    /\b(?:bc1[a-z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40})\b/;

const TEXT_RISK_PATTERNS: ReadonlyArray<{
    id: string;
    label: string;
    detail: string;
    severity: UrlRiskLevel;
    pattern: RegExp;
}> = [
    {
        id: "urgency",
        label: "Urgency pressure",
        detail: "The code pressures you to act quickly.",
        severity: "medium",
        pattern: /\b(urgent|immediately|act now|expires soon)\b/i,
    },
    {
        id: "payment",
        label: "Payment request",
        detail: "The code asks for a payment.",
        severity: "high",
        pattern: /\b(pay|payment|invoice|wire transfer|gift card|bank transfer)\b/i,
    },
    {
        id: "credential",
        label: "Credential request",
        detail: "The code asks for credentials.",
        severity: "high",
        pattern: /\b(password|verify your account|log in|sign in)\b/i,
    },
];

export class QrInspectionUseCase {
    private readonly urlInspector: UrlInspectionUseCase;

    public constructor(urlInspector?: UrlInspectionUseCase) {
        this.urlInspector = urlInspector ?? new UrlInspectionUseCase();
    }

    public execute(payload: string): QrInspectionResult {
        const trimmed = payload.trim();
        if (trimmed.length === 0) throw new AppError("VALIDATION_FAILED", "QR payload required.");
        if (trimmed.length > 4096)
            throw new AppError("VALIDATION_FAILED", "QR payload exceeds inspection limit.");

        const findings: QrFinding[] = [];
        const limitations: string[] = [
            "A QR code can point anywhere; the payload may be truncated or encoded.",
            "Scanning a QR code with a camera app may auto-open the link.",
        ];
        let payloadKind: QrPayloadKind = "text";

        if (
            /^https?:\/\//i.test(trimmed) ||
            /^[a-zA-Z][a-zA-Z0-9+.-]*\.[a-zA-Z]{2,}(?:\/|\?|$)/.test(trimmed)
        ) {
            payloadKind = "url";
            const urlResult = this.urlInspector.execute(trimmed);
            findings.push(
                ...urlResult.findings.map((finding) => ({
                    id: `url-${finding.id}`,
                    label: finding.label,
                    detail: finding.detail,
                    severity: finding.severity,
                })),
            );
            limitations.push(...urlResult.limitations);
        } else if (/^WIFI:/i.test(trimmed)) {
            payloadKind = "wifi";
            findings.push({
                id: "wifi-credentials",
                label: "Wi-Fi configuration",
                detail: "The code contains Wi-Fi settings. Joining a network you do not trust can expose your traffic.",
                severity: "medium",
            });
        } else if (/^BEGIN:VCARD/i.test(trimmed)) {
            payloadKind = "vcard";
            findings.push({
                id: "vcard-data",
                label: "Contact card",
                detail: "The code contains personal contact details.",
                severity: "medium",
            });
        } else if (CRYPTO_PATTERN.test(trimmed)) {
            payloadKind = "crypto";
            findings.push({
                id: "crypto-address",
                label: "Cryptocurrency address",
                detail: "The code contains a cryptocurrency address. Transactions are irreversible.",
                severity: "medium",
            });
        } else if (/^(?:mailto|tel|sms):/i.test(trimmed)) {
            payloadKind = "contact";
            findings.push({
                id: "contact-link",
                label: "Contact action",
                detail: "The code opens an email or phone action.",
                severity: "low",
            });
        }

        for (const entry of TEXT_RISK_PATTERNS) {
            if (entry.pattern.test(trimmed)) {
                findings.push({
                    id: entry.id,
                    label: entry.label,
                    detail: entry.detail,
                    severity: entry.severity,
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
                ? "The code payload does not show obvious risk patterns. This does not prove it is safe."
                : `${findings.length} risk indicator(s) found. This does not establish intent.`;

        return {
            payload: trimmed,
            payloadKind,
            riskLevel,
            findings,
            summary,
            limitations,
        };
    }
}
