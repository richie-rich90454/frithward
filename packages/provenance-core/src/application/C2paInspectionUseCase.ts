import { RESULT_CODES, resultCodeForText } from "@frithward/contracts";
import type {
    C2paInspectionResult,
    C2paSignatureStatus,
    C2paValidationEntry,
    C2paValidationFailure,
    TransformationStep,
} from "../domain/C2paManifest.js";
import type { ProvenanceRecord } from "../domain/ProvenanceRecord.js";
import type { ProvenanceRecordRepository } from "../ports/ProvenanceRecordRepository.js";
import type { C2paVerificationPort } from "../ports/C2paVerificationPort.js";

const HASH_KEYS = ["hash", "assetHash", "sha256", "assetSha256"];

function asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function parseManifest(value: unknown): Record<string, unknown> | null {
    if (typeof value === "string") {
        try {
            return asRecord(JSON.parse(value) as unknown);
        } catch {
            return null;
        }
    }
    return asRecord(value);
}

function asValidationEntries(value: unknown): C2paValidationEntry[] {
    if (!Array.isArray(value)) return [];
    const entries: C2paValidationEntry[] = [];
    for (const item of value) {
        const record = asRecord(item);
        if (!record) continue;
        const code = readString(record.code);
        if (!code) continue;
        const message = readString(record.message);
        const success = typeof record.success === "boolean" ? record.success : undefined;
        entries.push({
            code,
            ...(message === null ? {} : { message }),
            ...(success === undefined ? {} : { success }),
        });
    }
    return entries;
}

function summaryCodeFor(status: C2paSignatureStatus, summary: string): string {
    return (
        resultCodeForText(summary) ??
        (status === "valid"
            ? RESULT_CODES.C2PA_SUMMARY_VALID
            : status === "invalid"
              ? RESULT_CODES.C2PA_SUMMARY_INVALID
              : status === "unverified"
                ? RESULT_CODES.C2PA_SUMMARY_UNVERIFIED
                : RESULT_CODES.C2PA_SUMMARY_MISSING)
    );
}

function isFailureCode(code: string): boolean {
    return /invalid|failed|missing|untrusted|revoked/i.test(code);
}

function asAssertionLabels(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const labels: string[] = [];
    for (const item of value) {
        const record = asRecord(item);
        const label = record ? readString(record.label) : null;
        if (label) labels.push(label);
    }
    return labels;
}

function findHashInValue(value: unknown): string | null {
    const record = asRecord(value);
    if (!record) return null;
    for (const key of HASH_KEYS) {
        const hash = readString(record[key]);
        if (hash) return hash;
    }
    return null;
}

function findAssetHash(manifest: Record<string, unknown>): string | null {
    const assertions = Array.isArray(manifest.assertions) ? manifest.assertions : [];
    for (const item of assertions) {
        const record = asRecord(item);
        if (!record) continue;
        const label = readString(record.label) ?? "";
        if (/c2pa\.hash/i.test(label)) {
            const hash = findHashInValue(record.data);
            if (hash) return hash;
        }
    }
    const direct = findHashInValue(manifest);
    if (direct) return direct;
    const integrity = asRecord(manifest.integrity);
    if (integrity) {
        const hash = findHashInValue(integrity);
        if (hash) return hash;
    }
    return null;
}

function readActor(value: unknown): string | null {
    if (typeof value === "string") return readString(value);
    if (Array.isArray(value)) {
        const names = value.map((item) => readActor(item)).filter((name): name is string => !!name);
        return names.length > 0 ? names.join(", ") : null;
    }
    const record = asRecord(value);
    if (!record) return null;
    return readString(record.name) ?? readString(record.actor) ?? null;
}

function readTransformationHash(value: unknown, side: "before" | "after"): string | null {
    const record = asRecord(value);
    if (!record) return null;
    const keys =
        side === "before"
            ? ["assetHashBefore", "hashBefore", "beforeHash", "before"]
            : ["assetHashAfter", "hashAfter", "afterHash", "after"];
    for (const key of keys) {
        const hash = readString(record[key]);
        if (hash) return hash;
    }
    return null;
}

/** Reads only steps actually present in c2pa.actions assertions; no history is inferred. */
function parseTransformations(manifest: Record<string, unknown>): TransformationStep[] {
    const assertions = Array.isArray(manifest.assertions) ? manifest.assertions : [];
    const steps: TransformationStep[] = [];
    for (const item of assertions) {
        const assertion = asRecord(item);
        const label = assertion ? (readString(assertion.label) ?? "") : "";
        if (!label || !/^c2pa\.actions(?:\.|$)/i.test(label)) continue;
        const data = asRecord(assertion?.data);
        const actions = Array.isArray(data?.actions)
            ? data.actions
            : Array.isArray(assertion?.data)
              ? assertion.data
              : [];
        for (const actionItem of actions) {
            const action = asRecord(actionItem);
            if (!action) continue;
            const name = readString(action.action);
            if (!name) continue;
            const parameters = asRecord(action.parameters);
            steps.push({
                action: name,
                actor: readActor(action.actors ?? action.actor),
                timestamp: readString(action.when) ?? readString(action.timestamp),
                assetHashBefore:
                    readTransformationHash(action, "before") ??
                    readTransformationHash(parameters, "before"),
                assetHashAfter:
                    readTransformationHash(action, "after") ??
                    readTransformationHash(parameters, "after"),
                detail: readString(action.description) ?? readString(action.detail),
            });
        }
    }
    return steps;
}

export class C2paInspectionUseCase {
    public constructor(
        private readonly repository?: ProvenanceRecordRepository,
        private readonly verifier?: C2paVerificationPort,
    ) {}

    public async execute(input: { manifest: unknown; id?: string }): Promise<C2paInspectionResult> {
        if (this.verifier) return this.verifyWithSdk(input, this.verifier);

        const manifest = parseManifest(input.manifest);
        const limitations: string[] = [
            "Signature status is taken from the manifest and was not cryptographically re-verified.",
            "Timestamps come from the manifest and may not reflect real-world signing time.",
            "Assertions are reported as present but their contents were not validated.",
            "signature not verified via C2PA SDK",
        ];

        if (!manifest) {
            limitations.push(
                "No c2pa.actions assertion was available; no transformation history could be parsed.",
            );
            const result: C2paInspectionResult = {
                signatureStatus: "missing",
                signer: null,
                signedAt: null,
                assertions: [],
                assetHash: null,
                transformations: [],
                validationFailures: [],
                missingInfo: [
                    "manifest",
                    "signer",
                    "signature timestamp",
                    "assertions",
                    "asset hash",
                ],
                summary: "No readable C2PA manifest was provided.",
                limitations,
                summaryCode: RESULT_CODES.C2PA_SUMMARY_MISSING,
                limitationCodes: limitations.map(resultCodeForText),
                missingInfoCodes: [
                    RESULT_CODES.C2PA_MISSING_MANIFEST,
                    RESULT_CODES.C2PA_MISSING_SIGNER,
                    RESULT_CODES.C2PA_MISSING_TIMESTAMP,
                    RESULT_CODES.C2PA_MISSING_ASSERTIONS,
                    RESULT_CODES.C2PA_MISSING_HASH,
                ],
            };
            await this.persist(result, input.manifest, input.id);
            return result;
        }

        const signature = asRecord(manifest.signature);
        const validations = [
            ...asValidationEntries(manifest.validations),
            ...asValidationEntries(manifest.validationStatus),
        ];
        const validationFailures: C2paValidationFailure[] = validations
            .filter(
                (entry) =>
                    entry.success === false ||
                    (entry.success === undefined && isFailureCode(entry.code)),
            )
            .map((entry) => ({
                code: entry.code,
                message: entry.message ?? "Validation failed.",
            }));

        const signer = readString(signature?.issuer) ?? readString(signature?.signer) ?? null;
        const signedAt =
            readString(signature?.time) ??
            readString(signature?.timestamp) ??
            readString(manifest.createdAt) ??
            null;
        const assertionLabels = asAssertionLabels(manifest.assertions);
        const assetHash = findAssetHash(manifest);
        const transformations = parseTransformations(manifest);
        if (transformations.length === 0) {
            limitations.push(
                "No c2pa.actions assertion was available; no transformation history could be parsed.",
            );
        }

        let signatureStatus: C2paSignatureStatus;
        if (!signature) signatureStatus = "missing";
        else if (validationFailures.length > 0) signatureStatus = "invalid";
        else if (signer && readString(signature.alg)) signatureStatus = "valid";
        else signatureStatus = "unverified";

        const missingInfo: string[] = [];
        if (!signature) missingInfo.push("signature");
        if (!signer) missingInfo.push("signer");
        if (!signedAt) missingInfo.push("signature timestamp");
        if (assertionLabels.length === 0) missingInfo.push("assertions");
        if (!assetHash) missingInfo.push("asset hash");

        const summary = this.summarize(
            signatureStatus,
            signer,
            assertionLabels.length,
            validationFailures.length,
            missingInfo.length,
        );
        const result: C2paInspectionResult = {
            signatureStatus,
            signer,
            signedAt,
            assertions: assertionLabels.map((label) => ({ label, present: true })),
            assetHash,
            transformations,
            validationFailures,
            missingInfo,
            summary,
            limitations,
            summaryCode: summaryCodeFor(signatureStatus, summary),
            limitationCodes: limitations.map(resultCodeForText),
            missingInfoCodes: missingInfo.map(resultCodeForText),
        };
        await this.persist(result, input.manifest, input.id);
        return result;
    }

    private async verifyWithSdk(
        input: { manifest: unknown; id?: string },
        verifier: C2paVerificationPort,
    ): Promise<C2paInspectionResult> {
        let verification;
        try {
            verification = await verifier.verify(input.manifest);
        } catch (cause) {
            const detail = cause instanceof Error ? cause.message : "Unknown SDK error.";
            verification = {
                signatureStatus: "unverified" as const,
                signer: null,
                timestamp: null,
                assertions: [],
                validationFailures: [{ code: "sdk.error", message: detail }],
                limitations: [
                    `C2PA SDK verification failed: ${detail}`,
                    "signature not verified via C2PA SDK",
                ],
            };
        }

        const missingInfo: string[] = [];
        if (!verification.signer) missingInfo.push("signer");
        if (!verification.timestamp) missingInfo.push("signature timestamp");
        if (verification.assertions.length === 0) missingInfo.push("assertions");

        const manifest = parseManifest(input.manifest);
        const transformations = manifest ? parseTransformations(manifest) : [];
        const limitations = [...verification.limitations];
        if (transformations.length === 0) {
            limitations.push(
                "No c2pa.actions assertion was available; no transformation history could be parsed.",
            );
        }

        const summary = this.summarize(
            verification.signatureStatus,
            verification.signer,
            verification.assertions.length,
            verification.validationFailures.length,
            missingInfo.length,
        );
        const result: C2paInspectionResult = {
            signatureStatus: verification.signatureStatus,
            signer: verification.signer,
            signedAt: verification.timestamp,
            assertions: verification.assertions,
            assetHash: findAssetHash(manifest ?? {}),
            transformations,
            validationFailures: verification.validationFailures,
            missingInfo,
            summary,
            limitations,
            summaryCode: summaryCodeFor(verification.signatureStatus, summary),
            limitationCodes: limitations.map(resultCodeForText),
            missingInfoCodes: missingInfo.map(resultCodeForText),
        };
        await this.persist(result, input.manifest, input.id);
        return result;
    }

    private summarize(
        status: C2paSignatureStatus,
        signer: string | null,
        assertionCount: number,
        failureCount: number,
        missingCount: number,
    ): string {
        const signerText = signer ?? "unknown";
        const missingText = missingCount > 0 ? ` Missing info: ${missingCount} item(s).` : "";
        if (status === "valid")
            return `Signature claims to be valid; signer ${signerText}; ${assertionCount} assertion(s) present.${missingText}`;
        if (status === "invalid")
            return `Signature validation failed (${failureCount} failure(s)); evidence requires review.${missingText}`;
        if (status === "unverified")
            return `Signature present but not verified; signer ${signerText}.${missingText}`;
        return "No signature manifest found; provenance is unavailable.";
    }

    private async persist(
        result: C2paInspectionResult,
        manifest: unknown,
        id?: string,
    ): Promise<void> {
        if (!this.repository) return;
        const record: ProvenanceRecord = {
            id: id ?? globalThis.crypto.randomUUID(),
            signatureStatus: result.signatureStatus,
            signer: result.signer,
            assetSha256: result.assetHash ?? "",
            manifest: typeof manifest === "string" ? manifest : JSON.stringify(manifest),
            transformations: result.transformations,
        };
        await this.repository.save(record);
    }
}
