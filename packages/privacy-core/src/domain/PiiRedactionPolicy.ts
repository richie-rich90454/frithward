import type { MetadataFindingKind } from "./MetadataFinding.js";

export const DEFAULT_REDACTION_KINDS: readonly MetadataFindingKind[] = [
    "exif-gps",
    "pii-email",
    "pii-phone",
    "pii-address",
    "pii-name",
];

export const DEFAULT_REGION_KINDS: readonly MetadataFindingKind[] = [
    "pii-email",
    "pii-phone",
    "pii-address",
    "pii-name",
];

export class PiiRedactionPolicy {
    public readonly redactionKinds: readonly MetadataFindingKind[];
    public readonly regionKinds: readonly MetadataFindingKind[];

    public constructor(input?: {
        redactionKinds?: readonly MetadataFindingKind[];
        regionKinds?: readonly MetadataFindingKind[];
    }) {
        this.redactionKinds = input?.redactionKinds ?? DEFAULT_REDACTION_KINDS;
        this.regionKinds = input?.regionKinds ?? DEFAULT_REGION_KINDS;
    }

    public requiresRedaction(findings: readonly { kind: MetadataFindingKind }[]): boolean {
        return findings.some((finding) => this.redactionKinds.includes(finding.kind));
    }

    public requiresRegion(kind: MetadataFindingKind): boolean {
        return this.regionKinds.includes(kind);
    }
}
