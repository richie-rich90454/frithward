export const METADATA_FINDING_KINDS = [
    "exif-gps",
    "exif-device",
    "exif-timestamp",
    "pii-email",
    "pii-phone",
    "pii-address",
    "pii-name",
] as const;

export type MetadataFindingKind = (typeof METADATA_FINDING_KINDS)[number];

export type MetadataFindingSeverity = "low" | "medium" | "high";

export interface MetadataFinding {
    id: string;
    kind: MetadataFindingKind;
    detail: string;
    remediation: string;
    severity: MetadataFindingSeverity;
}

export interface MetadataPayload {
    fileName: string;
    fields: Record<string, string | number | boolean | null>;
}

export interface MetadataInspectionResult {
    fileName: string;
    findings: readonly MetadataFinding[];
    remediation: readonly string[];
    safeToShare: boolean;
}
