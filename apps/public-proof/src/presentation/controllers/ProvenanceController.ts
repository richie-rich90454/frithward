export type SignatureStatus = "valid" | "invalid" | "unverified" | "missing";

export interface AssertionInfo {
    label: string;
    present: boolean;
}

export type FileSource = "paste" | "json-file" | "binary-file";

export interface ProvenanceResult {
    source: FileSource;
    fileName: string | null;
    sha256: string | null;
    signatureStatus: SignatureStatus;
    signer: string | null;
    timestamp: string | null;
    assertions: readonly AssertionInfo[];
    limitations: string[];
    summary: string;
}

export interface FileLike {
    readonly name: string;
    arrayBuffer(): Promise<ArrayBuffer>;
}

export type EmbeddedManifestResult =
    | { kind: "found"; manifest: unknown }
    | { kind: "missing" }
    | { kind: "unavailable"; reason: string };

export interface EmbeddedManifestExtractor {
    extract(bytes: Uint8Array): Promise<EmbeddedManifestResult>;
}

/** The native C2PA SDK cannot run in a browser, so the default never claims a verified signature. */
export const BROWSER_EXTRACTOR: EmbeddedManifestExtractor = {
    async extract() {
        return {
            kind: "unavailable",
            reason: "Embedded C2PA extraction needs the native @contentauth/c2pa-node SDK, which is not available in this browser.",
        };
    },
};

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const LIMITATIONS = [
    "This page reads the selected file or pasted JSON in your browser and does not upload it. It does not cryptographically verify the signature, the certificate chain, or the asset hash.",
    "Every field shown here comes from the file itself and could have been changed. Treat the output as a summary, not as proof of origin.",
    "Timestamps are strings from the manifest and were not checked against a trusted time source.",
    "Assertions are reported as present only; their contents were not validated.",
];

interface ManifestMeta {
    source: FileSource;
    fileName: string | null;
    sha256: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readAssertions(value: unknown): AssertionInfo[] {
    if (!Array.isArray(value)) return [];
    const labels: AssertionInfo[] = [];
    for (const entry of value) {
        const record = asRecord(entry);
        const label = record ? readString(record.label) : null;
        if (label) labels.push({ label, present: true });
    }
    return labels;
}

function hasValidationFailures(value: unknown): boolean {
    if (!Array.isArray(value)) return false;
    return value.some((entry) => {
        const record = asRecord(entry);
        if (!record) return false;
        if (record.success === false) return true;
        const code = readString(record.code) ?? "";
        return /invalid|failed|missing|untrusted|revoked/i.test(code);
    });
}

export class ProvenanceController {
    private readonly listeners = new Set<() => void>();
    private result: ProvenanceResult | null = null;
    private error: string | null = null;

    public constructor(private readonly extractor: EmbeddedManifestExtractor = BROWSER_EXTRACTOR) {}

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getResult(): ProvenanceResult | null {
        return this.result;
    }

    public getError(): string | null {
        return this.error;
    }

    public verify(manifestText: string): void {
        this.applyManifest(manifestText, { source: "paste", fileName: null, sha256: null });
    }

    public async verifyFile(file: FileLike): Promise<void> {
        let bytes: Uint8Array;
        let sha256: string;
        try {
            bytes = new Uint8Array(await file.arrayBuffer());
            sha256 = await sha256Hex(bytes);
        } catch {
            this.fail("The selected file could not be read in this browser.");
            return;
        }
        const meta: ManifestMeta = { source: "binary-file", fileName: file.name, sha256 };

        if (/\.json$/i.test(file.name)) {
            this.applyManifest(new TextDecoder().decode(bytes), { ...meta, source: "json-file" });
            return;
        }

        let extraction: EmbeddedManifestResult;
        try {
            extraction = await this.extractor.extract(bytes);
        } catch (cause) {
            extraction = {
                kind: "unavailable",
                reason: cause instanceof Error ? cause.message : "Extractor failed.",
            };
        }

        if (extraction.kind === "found") {
            this.inspectManifest(extraction.manifest, meta, [
                "The manifest was read from the file locally; its signature was not cryptographically verified here.",
            ]);
            return;
        }

        const unavailable =
            extraction.kind === "unavailable"
                ? "Embedded manifest extraction and cryptographic verification are unavailable here: " +
                  extraction.reason
                : "No embedded C2PA manifest was found in this file. Cryptographic verification is unavailable in this browser, so no signature was checked.";
        this.result = {
            ...meta,
            signatureStatus: extraction.kind === "unavailable" ? "unverified" : "missing",
            signer: null,
            timestamp: null,
            assertions: [],
            limitations: [...LIMITATIONS, unavailable],
            summary: unavailable,
        };
        this.error = null;
        this.notify();
    }

    private applyManifest(text: string, meta: ManifestMeta): void {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text) as unknown;
        } catch {
            this.fail("That input is not valid JSON. Provide a C2PA manifest object as JSON.");
            return;
        }
        if (!asRecord(parsed)) {
            this.fail("The JSON must be an object describing a manifest.");
            return;
        }
        this.inspectManifest(parsed, meta, []);
    }

    private inspectManifest(value: unknown, meta: ManifestMeta, extraLimitations: string[]): void {
        const manifest = asRecord(value);
        if (!manifest) {
            this.fail("The manifest must be an object.");
            return;
        }

        const signature = asRecord(manifest.signature);
        const assertions = readAssertions(manifest.assertions);
        const signer =
            readString(signature?.issuer) ??
            readString(signature?.signer) ??
            readString(manifest.claimGenerator);
        const timestamp =
            readString(signature?.time) ??
            readString(signature?.timestamp) ??
            readString(manifest.createdAt);
        const failures =
            hasValidationFailures(manifest.validations) ||
            hasValidationFailures(manifest.validationStatus);

        let signatureStatus: SignatureStatus;
        if (!signature) signatureStatus = "missing";
        else if (failures) signatureStatus = "invalid";
        else if (signer && readString(signature.alg)) signatureStatus = "valid";
        else signatureStatus = "unverified";

        const statusText: Record<SignatureStatus, string> = {
            valid: "The manifest claims a valid signature, but this page did not verify it.",
            invalid: "The manifest contains validation failures; the claim needs review.",
            unverified: "A signature is present but the signer or algorithm is incomplete.",
            missing: "No signature was found in the manifest.",
        };
        this.result = {
            ...meta,
            signatureStatus,
            signer,
            timestamp,
            assertions,
            limitations: [...LIMITATIONS, ...extraLimitations],
            summary: `${statusText[signatureStatus]} Signer: ${signer ?? "unknown"}; ${assertions.length} assertion(s) listed.`,
        };
        this.error = null;
        this.notify();
    }

    private fail(message: string): void {
        this.error = message;
        this.result = null;
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
