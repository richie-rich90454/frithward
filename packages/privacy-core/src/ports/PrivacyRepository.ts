import type { MetadataFinding } from "../domain/MetadataFinding.js";

export interface PrivacyInspectionRecord {
    id: string;
    fileName: string;
    findings: readonly MetadataFinding[];
    safeToShare: boolean;
    inspectedAt: string;
}

export interface PrivacyRepository {
    save(record: PrivacyInspectionRecord): Promise<void>;
    load(id: string): Promise<PrivacyInspectionRecord | null>;
    list(): Promise<readonly PrivacyInspectionRecord[]>;
}
