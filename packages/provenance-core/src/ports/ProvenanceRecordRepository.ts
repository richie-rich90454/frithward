import type { ProvenanceRecord } from "../domain/ProvenanceRecord.js";

export interface ProvenanceRecordRepository {
    save(record: ProvenanceRecord): Promise<void>;
    load(id: string): Promise<ProvenanceRecord | null>;
    list(): Promise<readonly ProvenanceRecord[]>;
}
