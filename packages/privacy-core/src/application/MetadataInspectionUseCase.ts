import { AppError } from "@frithward/contracts";
import type {
    MetadataFinding,
    MetadataFindingKind,
    MetadataFindingSeverity,
    MetadataInspectionResult,
    MetadataPayload,
} from "../domain/MetadataFinding.js";

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_PATTERN = /\+?\d[\d\s().-]{6,}\d/;
const ADDRESS_PATTERN =
    /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|way|place|pl|terrace|ter)\b/i;

interface FindingDetail {
    severity: MetadataFindingSeverity;
    detail: string;
    remediation: string;
}

const FINDING_DETAILS: Record<MetadataFindingKind, FindingDetail> = {
    "exif-gps": {
        severity: "high",
        detail: "The file stores GPS coordinates of where it was captured.",
        remediation: "Strip GPS coordinates or avoid sharing the original file.",
    },
    "exif-device": {
        severity: "low",
        detail: "The file stores camera or device details.",
        remediation: "Remove device metadata if it is not needed.",
    },
    "exif-timestamp": {
        severity: "low",
        detail: "The file stores capture timestamps.",
        remediation: "Remove timestamps that reveal personal routines.",
    },
    "pii-email": {
        severity: "high",
        detail: "The file contains an email address.",
        remediation: "Remove email addresses from metadata before sharing.",
    },
    "pii-phone": {
        severity: "high",
        detail: "The file contains a phone number.",
        remediation: "Remove phone numbers from metadata before sharing.",
    },
    "pii-address": {
        severity: "high",
        detail: "The file contains a street address.",
        remediation: "Remove addresses from metadata before sharing.",
    },
    "pii-name": {
        severity: "medium",
        detail: "The file contains a personal name.",
        remediation: "Remove personal names from metadata before sharing.",
    },
};

function looksLikePhone(value: string): boolean {
    const match = PHONE_PATTERN.exec(value);
    if (!match) return false;
    const candidate = match[0];
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return false;
    return /[+\-().\s]/.test(candidate);
}

export class MetadataInspectionUseCase {
    public execute(payload: MetadataPayload): MetadataInspectionResult {
        if (payload.fileName.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "File name required.");

        const fields = new Map<string, string>();
        for (const [key, value] of Object.entries(payload.fields)) {
            if (value === null) continue;
            fields.set(key.toLowerCase(), String(value));
        }

        const kinds = new Set<MetadataFindingKind>();
        for (const key of fields.keys()) {
            if (/gps/i.test(key)) kinds.add("exif-gps");
            else if (key === "make" || key === "model" || key === "camera" || key === "lensmodel")
                kinds.add("exif-device");
            else if (/datetime(original|digitized)?|createdate|modifydate/.test(key))
                kinds.add("exif-timestamp");
            else if (key === "artist" || key === "creator" || key === "byline" || key === "author")
                kinds.add("pii-name");
        }
        for (const value of fields.values()) {
            if (EMAIL_PATTERN.test(value)) kinds.add("pii-email");
            if (looksLikePhone(value)) kinds.add("pii-phone");
            if (ADDRESS_PATTERN.test(value)) kinds.add("pii-address");
        }

        const findings: MetadataFinding[] = [...kinds].map((kind) => ({
            id: `${payload.fileName}-${kind}`,
            kind,
            ...FINDING_DETAILS[kind],
        }));
        const remediation = [...new Set(findings.map((finding) => finding.remediation))];
        const safeToShare = findings.every((finding) => finding.severity === "low");
        return { fileName: payload.fileName, findings, remediation, safeToShare };
    }
}
