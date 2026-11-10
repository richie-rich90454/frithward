import type {
    C2paInspectionResult,
    C2paSignatureStatus,
    C2paValidationEntry,
    C2paValidationFailure,
} from "../domain/C2paManifest.js";
import type { ProvenanceRecord } from "../domain/ProvenanceRecord.js";
import type { ProvenanceRecordRepository } from "../ports/ProvenanceRecordRepository.js";

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

export class C2paInspectionUseCase {
    public constructor(private readonly repository?: ProvenanceRecordRepository) {}

    public async execute(input: { manifest: unknown; id?: string }): Promise<C2paInspectionResult> {
        const manifest = parseManifest(input.manifest);
        const limitations = [
            "Signature status is taken from the manifest and was not cryptographically re-verified.",
            "Timestamps come from the manifest and may not reflect real-world signing time.",
            "Assertions are reported as present but their contents were not validated.",
        ];

        if (!manifest) {
            const result: C2paInspectionResult = {
                signatureStatus: "missing",
                signer: null,
                signedAt: null,
                assertions: [],
                assetHash: null,
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
            validationFailures,
            missingInfo,
            summary,
            limitations,
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
        };
        await this.repository.save(record);
    }
}
