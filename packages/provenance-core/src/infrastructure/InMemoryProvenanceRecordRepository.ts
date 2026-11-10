import { AppError } from "@frithward/contracts";
import type { ProvenanceRecord } from "../domain/ProvenanceRecord.js";
import type { ProvenanceRecordRepository } from "../ports/ProvenanceRecordRepository.js";

export class InMemoryProvenanceRecordRepository implements ProvenanceRecordRepository {
    private readonly records = new Map<string, ProvenanceRecord>();

    public async save(record: ProvenanceRecord): Promise<void> {
        if (record.id.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Provenance record id required.");
        if (record.assetSha256.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset hash required.");
        this.records.set(record.id, { ...record });
    }

    public async load(id: string): Promise<ProvenanceRecord | null> {
        const record = this.records.get(id);
        return record ? { ...record } : null;
    }

    public async list(): Promise<readonly ProvenanceRecord[]> {
        return [...this.records.values()].map((record) => ({ ...record }));
    }
}
