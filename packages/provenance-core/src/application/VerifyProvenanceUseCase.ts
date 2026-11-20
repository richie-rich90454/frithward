import type { TransformationStep } from "../domain/C2paManifest.js";
import type { ProvenanceRecord } from "../domain/ProvenanceRecord.js";

/** Accepts records persisted before transformation history was added. */
type DescribeInput = Omit<ProvenanceRecord, "transformations"> & {
    transformations?: readonly TransformationStep[];
};

export class VerifyProvenanceUseCase {
    public describe(record: DescribeInput): string {
        const count = record.transformations?.length ?? 0;
        const transformations =
            count > 0
                ? `${count} transformation(s) recorded.`
                : "No transformation history available.";
        if (record.signatureStatus === "valid")
            return `Signature valid; signer ${record.signer ?? "unknown"}. ${transformations}`;
        if (record.signatureStatus === "invalid")
            return `Signature invalid; evidence requires review. ${transformations}`;
        if (record.signatureStatus === "unverified")
            return `Signature present but unverified; provenance is unconfirmed. ${transformations}`;
        return `No signature manifest found; provenance is unavailable. ${transformations}`;
    }
}
