import type { ProvenanceRecord } from "../domain/ProvenanceRecord.js";

export class VerifyProvenanceUseCase {
    public describe(record: ProvenanceRecord): string {
        if (record.signatureStatus === "valid")
            return `Signature valid; signer ${record.signer ?? "unknown"}.`;
        if (record.signatureStatus === "invalid")
            return "Signature invalid; evidence requires review.";
        if (record.signatureStatus === "unverified")
            return "Signature present but unverified; provenance is unconfirmed.";
        return "No signature manifest found; provenance is unavailable.";
    }
}
