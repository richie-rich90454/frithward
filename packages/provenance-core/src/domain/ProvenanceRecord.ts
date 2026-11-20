import type { TransformationStep } from "./C2paManifest.js";

export interface ProvenanceRecord {
    id: string;
    signatureStatus: "valid" | "invalid" | "missing" | "unverified";
    signer: string | null;
    assetSha256: string;
    manifest: string | null;
    transformations: readonly TransformationStep[];
}
