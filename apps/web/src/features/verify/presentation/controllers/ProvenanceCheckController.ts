import {
    C2paInspectionUseCase,
    type C2paInspectionResult,
    type C2paSignatureStatus,
} from "@frithward/provenance-core";

export interface ProvenanceAssertionView {
    label: string;
    present: boolean;
}

export interface ProvenanceFailureView {
    code: string;
    message: string;
}

export interface ProvenanceInspectionView {
    signatureStatus: C2paSignatureStatus;
    signer: string | null;
    signedAt: string | null;
    assertions: readonly ProvenanceAssertionView[];
    assetHash: string | null;
    validationFailures: readonly ProvenanceFailureView[];
    missingInfo: readonly string[];
    summary: string;
    limitations: readonly string[];
}

export interface C2paInspector {
    execute(input: { manifest: unknown; id?: string }): Promise<C2paInspectionResult>;
}

export interface ProvenanceCheckControllerOptions {
    inspector?: C2paInspector;
}

export class ProvenanceCheckController {
    private readonly inspector: C2paInspector;
    private readonly listeners = new Set<() => void>();
    private result: ProvenanceInspectionView | null = null;
    private error: string | null = null;

    public constructor(options: ProvenanceCheckControllerOptions = {}) {
        this.inspector = options.inspector ?? new C2paInspectionUseCase();
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getResult(): ProvenanceInspectionView | null {
        return this.result;
    }

    public getError(): string | null {
        return this.error;
    }

    public async inspect(manifestText: string): Promise<void> {
        try {
            if (manifestText.trim().length === 0) throw new Error("Manifest required.");
            let manifest: unknown;
            try {
                manifest = JSON.parse(manifestText) as unknown;
            } catch {
                throw new Error("Manifest must be valid JSON.");
            }
            this.result = toView(await this.inspector.execute({ manifest }));
            this.error = null;
        } catch (cause) {
            this.result = null;
            this.error = cause instanceof Error ? cause.message : "Provenance inspection failed.";
        }
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}

function toView(result: C2paInspectionResult): ProvenanceInspectionView {
    return {
        signatureStatus: result.signatureStatus,
        signer: result.signer,
        signedAt: result.signedAt,
        assertions: result.assertions.map((assertion) => ({
            label: assertion.label,
            present: assertion.present,
        })),
        assetHash: result.assetHash,
        validationFailures: result.validationFailures.map((failure) => ({
            code: failure.code,
            message: failure.message,
        })),
        missingInfo: [...result.missingInfo],
        summary: result.summary,
        limitations: [...result.limitations],
    };
}
