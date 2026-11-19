export type SignatureStatus = "valid" | "invalid" | "unverified" | "missing";

export interface AssertionInfo {
    label: string;
    present: boolean;
}

export interface ProvenanceResult {
    signatureStatus: SignatureStatus;
    signer: string | null;
    timestamp: string | null;
    assertions: readonly AssertionInfo[];
    limitations: string[];
    summary: string;
}

const LIMITATIONS = [
    "This page only parses the manifest text you paste. It does not cryptographically verify the signature, the certificate chain, or the asset hash.",
    "Every field shown here comes from the pasted manifest and could have been changed. Treat the output as a summary, not as proof of origin.",
    "Timestamps are strings from the manifest and were not checked against a trusted time source.",
    "Assertions are reported as present only; their contents were not validated.",
];

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
        let parsed: unknown;
        try {
            parsed = JSON.parse(manifestText) as unknown;
        } catch {
            this.error = "That text is not valid JSON. Paste a C2PA manifest object.";
            this.result = null;
            this.notify();
            return;
        }
        const manifest = asRecord(parsed);
        if (!manifest) {
            this.error = "The JSON must be an object describing a manifest.";
            this.result = null;
            this.notify();
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
            signatureStatus,
            signer,
            timestamp,
            assertions,
            limitations: [...LIMITATIONS],
            summary: `${statusText[signatureStatus]} Signer: ${signer ?? "unknown"}; ${assertions.length} assertion(s) listed.`,
        };
        this.error = null;
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
