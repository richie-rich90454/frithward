import {
    C2paInspectionUseCase,
    type C2paInspectionResult,
    type C2paSignatureStatus,
    type C2paVerificationPort,
} from "@frithward/provenance-core";
import { english, type Translator } from "../../../../i18n/translate.js";
import { resultList, resultText } from "../../../../i18n/results.js";

const MISSING_FRAGMENT = " Missing info: {n} item(s).";

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
    missingInfoCodes?: readonly (string | undefined)[] | undefined;
    summary: string;
    summaryCode?: string | undefined;
    limitations: readonly string[];
    limitationCodes?: readonly (string | undefined)[] | undefined;
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
    verifier?: C2paVerificationPort;
    translate?: Translator;
}

export class ProvenanceCheckController {
    private readonly inspector: C2paInspector;
    private readonly fileInspector: C2paInspector | null;
    private readonly extractor: C2paManifestExtractor | null;
    private readonly translate: Translator;
    private readonly listeners = new Set<() => void>();
    private result: ProvenanceInspectionView | null = null;
    private error: string | null = null;

    public constructor(options: ProvenanceCheckControllerOptions = {}) {
        this.inspector = options.inspector ?? new C2paInspectionUseCase();
        this.fileInspector = options.verifier
            ? new C2paInspectionUseCase(undefined, options.verifier)
            : null;
        this.extractor = options.extractor ?? null;
        this.translate = options.translate ?? english;
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
            if (manifestText.trim().length === 0)
                throw new Error(this.translate("verify.error.manifestRequired"));
            let manifest: unknown;
            try {
                manifest = JSON.parse(manifestText) as unknown;
            } catch {
                throw new Error(this.translate("verify.error.manifestJson"));
            }
            this.result = toView(this.translate, await this.inspector.execute({ manifest }));
            this.error = null;
        } catch (cause) {
            this.result = null;
            this.error =
                cause instanceof Error
                    ? cause.message
                    : this.translate("verify.error.inspectionFailed");
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
                    throw new Error(this.translate("verify.error.fileJson"));
                }
            } else if (this.fileInspector) {
                // Binary assets go through the real byte-level cryptographic verifier.
                this.result = toView(
                    this.translate,
                    await this.fileInspector.execute({ manifest: input.bytes }),
                );
                this.error = null;
                this.notify();
                return;
            } else {
                manifest = this.extractor ? await this.extractor.extract(input.bytes) : null;
                if (manifest === null) {
                    this.result = unavailableView(this.translate);
                    this.error = null;
                    this.notify();
                    return;
                }
            }
            this.result = toView(this.translate, await this.inspector.execute({ manifest }));
            this.error = null;
        } catch (cause) {
            this.result = null;
            this.error =
                cause instanceof Error
                    ? cause.message
                    : this.translate("verify.error.inspectionFailed");
        }
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}

function toView(t: Translator, result: C2paInspectionResult): ProvenanceInspectionView {
    const missing = result.missingInfo.length
        ? resultText(t, MISSING_FRAGMENT, "C2PA_SUMMARY_MISSING_FRAGMENT", {
              n: result.missingInfo.length,
          })
        : "";
    const summaryParams = {
        signer: result.signer ?? t("check.unknown"),
        n:
            result.signatureStatus === "invalid"
                ? result.validationFailures.length
                : result.assertions.length,
        missing,
    };
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
            message: resultText(t, failure.message),
        })),
        missingInfo: resultList(t, result.missingInfo, result.missingInfoCodes),
        summary: resultText(t, result.summary, result.summaryCode, summaryParams),
        limitations: resultList(t, result.limitations, result.limitationCodes),
    };
}

function isJsonFile(input: ProvenanceFileInput): boolean {
    if (/\.json$/i.test(input.name.trim())) return true;
    const sample = new TextDecoder().decode(input.bytes.subarray(0, 64)).trimStart();
    return sample.startsWith("{") || sample.startsWith("[");
}

/** Honest fallback when no local C2PA manifest can be read from a binary asset. */
function unavailableView(translate: Translator): ProvenanceInspectionView {
    return {
        signatureStatus: "missing",
        signer: null,
        signedAt: null,
        assertions: [],
        assetHash: null,
        transformations: [],
        validationFailures: [],
        missingInfo: [
            translate("verify.unavailable.missing.0"),
            translate("verify.unavailable.missing.1"),
            translate("verify.unavailable.missing.2"),
            translate("verify.unavailable.missing.3"),
            translate("verify.unavailable.missing.4"),
        ],
        summary: translate("verify.unavailable.summary"),
        limitations: [
            translate("verify.unavailable.limitation.0"),
            translate("verify.unavailable.limitation.1"),
        ],
    };
}
