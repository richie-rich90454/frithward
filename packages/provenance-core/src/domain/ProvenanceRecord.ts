export interface ProvenanceRecord {
    id: string;
    signatureStatus: "valid" | "invalid" | "missing";
    signer: string | null;
    assetSha256: string;
    manifest: string | null;
}
