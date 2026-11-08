import { ProvenanceRecord } from "../domain/ProvenanceRecord.js";

export class VerifyProvenanceUseCase {
    public describe(record: ProvenanceRecord): string {
        if (record.signatureStatus === "valid")
            return `Signature valid; signer ${record.signer ?? "unknown"}.`;
        if (record.signatureStatus === "invalid")
            return "Signature invalid; evidence requires review.";
        return "No signature manifest found; provenance is unavailable.";
    }
}
