import { VerifyProvenanceUseCase } from "@frithward/provenance-core";
import type { ProvenanceRecord } from "@frithward/provenance-core";

export type SignatureStatus = ProvenanceRecord["signatureStatus"];

export class ProvenanceCheckController {
    private readonly verifier = new VerifyProvenanceUseCase();
    private readonly listeners = new Set<() => void>();
    private record: ProvenanceRecord = {
        id: "asset",
        signatureStatus: "missing",
        signer: null,
        assetSha256: "",
        manifest: null,
    };
    private result: string | null = null;

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getRecord(): ProvenanceRecord {
        return this.record;
    }

    public getResult(): string | null {
        return this.result;
    }

    public setSignatureStatus(status: SignatureStatus): void {
        this.record = { ...this.record, signatureStatus: status };
        this.result = null;
        this.notify();
    }

    public setSigner(signer: string): void {
        this.record = { ...this.record, signer: signer.trim() === "" ? null : signer.trim() };
        this.result = null;
        this.notify();
    }

    public setAssetSha256(assetSha256: string): void {
        this.record = { ...this.record, assetSha256 };
        this.result = null;
        this.notify();
    }

    public verify(): void {
        this.result = this.verifier.describe(this.record);
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
