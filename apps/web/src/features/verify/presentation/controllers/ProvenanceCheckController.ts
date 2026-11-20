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

export interface ProvenanceTransformationView {
    action: string;
    actor: string | null;
    timestamp: string | null;
    assetHashBefore: string | null;
    assetHashAfter: string | null;
    detail: string | null;
}

export interface ProvenanceInspectionView {
    signatureStatus: C2paSignatureStatus;
    signer: string | null;
    signedAt: string | null;
    assertions: readonly ProvenanceAssertionView[];
    assetHash: string | null;
    transformations: readonly ProvenanceTransformationView[];
    validationFailures: readonly ProvenanceFailureView[];
    missingInfo: readonly string[];
    summary: string;
    limitations: readonly string[];
}

export interface C2paInspector {
    execute(input: { manifest: unknown; id?: string }): Promise<C2paInspectionResult>;
}

export interface C2paManifestExtractor {
    extract(bytes: Uint8Array): Promise<unknown | null>;
}

export interface ProvenanceFileInput {
    name: string;
    bytes: Uint8Array;
}

export interface ProvenanceCheckControllerOptions {
    inspector?: C2paInspector;
    extractor?: C2paManifestExtractor;
}

export class ProvenanceCheckController {
    private readonly inspector: C2paInspector;
    private readonly extractor: C2paManifestExtractor | null;
    private readonly listeners = new Set<() => void>();
    private result: ProvenanceInspectionView | null = null;
    private error: string | null = null;

    public constructor(options: ProvenanceCheckControllerOptions = {}) {
        this.inspector = options.inspector ?? new C2paInspectionUseCase();
        this.extractor = options.extractor ?? null;
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

    public async inspectFile(input: ProvenanceFileInput): Promise<void> {
        try {
            let manifest: unknown;
            if (isJsonFile(input)) {
                const text = new TextDecoder().decode(input.bytes);
                try {
                    manifest = JSON.parse(text) as unknown;
                } catch {
                    throw new Error("File must contain valid JSON.");
                }
            } else {
                manifest = this.extractor ? await this.extractor.extract(input.bytes) : null;
                if (manifest === null) {
                    this.result = unavailableView();
                    this.error = null;
                    this.notify();
                    return;
                }
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
        transformations: result.transformations.map((step) => ({
            action: step.action,
            actor: step.actor,
            timestamp: step.timestamp,
            assetHashBefore: step.assetHashBefore,
            assetHashAfter: step.assetHashAfter,
            detail: step.detail,
        })),
        validationFailures: result.validationFailures.map((failure) => ({
            code: failure.code,
            message: failure.message,
        })),
        missingInfo: [...result.missingInfo],
        summary: result.summary,
        limitations: [...result.limitations],
    };
}

function isJsonFile(input: ProvenanceFileInput): boolean {
    if (/\.json$/i.test(input.name.trim())) return true;
    const sample = new TextDecoder().decode(input.bytes.subarray(0, 64)).trimStart();
    return sample.startsWith("{") || sample.startsWith("[");
}

/** Honest fallback when no local C2PA manifest can be read from a binary asset. */
function unavailableView(): ProvenanceInspectionView {
    return {
        signatureStatus: "missing",
        signer: null,
        signedAt: null,
        assertions: [],
        assetHash: null,
        transformations: [],
        validationFailures: [],
        missingInfo: [
            "embedded C2PA manifest",
            "signer",
            "signature timestamp",
            "assertions",
            "asset hash",
        ],
        summary:
            "No embedded C2PA manifest could be extracted locally; provenance verification is unavailable.",
        limitations: [
            "Local C2PA manifest extraction from image or video files is not available in this browser.",
            "No signature was verified. Do not treat this file as having valid provenance.",
        ],
    };
}
