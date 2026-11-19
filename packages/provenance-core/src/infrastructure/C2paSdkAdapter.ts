import type { Reader } from "@contentauth/c2pa-node";
import type {
    C2paVerificationPort,
    C2paVerificationResult,
} from "../ports/C2paVerificationPort.js";

/** Raised when the official C2PA SDK cannot be loaded. Verification must not be faked. */
export class C2paSdkUnavailableError extends Error {
    public readonly code = "EXTERNAL_UNAVAILABLE";

    public constructor(cause?: unknown) {
        super(
            "The official C2PA SDK (@contentauth/c2pa-node) is required for signature " +
                "verification but could not be loaded.",
        );
        this.name = "C2paSdkUnavailableError";
        if (cause instanceof Error) this.cause = cause;
    }
}

interface SdkStatusEntry {
    code?: unknown;
    explanation?: unknown;
    success?: unknown;
}

interface SdkManifest {
    signature_info?: { issuer?: unknown; common_name?: unknown; time?: unknown } | null;
    assertions?: readonly { label?: unknown }[] | null;
}

interface SdkManifestStore {
    active_manifest?: unknown;
    validation_state?: unknown;
    validation_status?: readonly SdkStatusEntry[] | null;
    validation_results?: {
        activeManifest?: { failure?: readonly SdkStatusEntry[] } | null;
    } | null;
    manifests?: Record<string, SdkManifest> | null;
}

type SdkSource = { buffer: Uint8Array } | { path: string };
type SdkLoader = (source: SdkSource) => Promise<Reader | null>;

function nonEmptyString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toSourceAsset(asset: unknown): { buffer: Uint8Array } | { path: string } {
    if (asset instanceof Uint8Array) return { buffer: asset };
    if (typeof asset === "object" && asset !== null) {
        const record = asset as Record<string, unknown>;
        if (record.buffer instanceof Uint8Array) return { buffer: record.buffer };
        const path = nonEmptyString(record.path);
        if (path) return { path };
    }
    throw new TypeError(
        "C2PA verification requires a binary asset (Uint8Array/Buffer) or a { buffer } / { path } object.",
    );
}

function toSdkAsset(source: SdkSource): unknown {
    if ("path" in source) return { path: source.path };
    const bufferFactory = (globalThis as unknown as {
        Buffer?: { from(value: Uint8Array): Uint8Array };
    }).Buffer;
    return { buffer: bufferFactory ? bufferFactory.from(source.buffer) : source.buffer };
}

async function loadReader(source: SdkSource): Promise<Reader | null> {
    let sdk: typeof import("@contentauth/c2pa-node");
    try {
        sdk = await import("@contentauth/c2pa-node");
        type SdkAsset = Parameters<typeof sdk.Reader.fromAsset>[0];
        return await sdk.Reader.fromAsset(toSdkAsset(source) as SdkAsset);
    } catch (cause) {
        throw new C2paSdkUnavailableError(cause);
    }
}

/**
 * Verifies C2PA assets with the official Adobe/contentauth SDK.
 * Every result here is backed by the SDK's cryptographic validation.
 */
export class C2paSdkAdapter implements C2paVerificationPort {
    public constructor(private readonly loader: SdkLoader = loadReader) {}

    public async verify(asset: unknown): Promise<C2paVerificationResult> {
        const source = toSourceAsset(asset);
        let reader: Reader | null;
        try {
            reader = await this.loader(source);
        } catch (cause) {
            const detail = cause instanceof Error ? cause.message : "Unknown SDK error.";
            return {
                signatureStatus: "unverified",
                signer: null,
                timestamp: null,
                assertions: [],
                validationFailures: [{ code: "sdk.error", message: detail }],
                limitations: [
                    `C2PA SDK verification failed: ${detail}`,
                    "Signature was NOT verified; this result must not be treated as valid provenance.",
                ],
            };
        }

        if (!reader) {
            return {
                signatureStatus: "missing",
                signer: null,
                timestamp: null,
                assertions: [],
                validationFailures: [],
                limitations: [
                    "No embedded C2PA manifest was found in the asset by the official SDK.",
                ],
            };
        }

        const store = reader.json() as unknown as SdkManifestStore;
        const activeLabel = nonEmptyString(store.active_manifest);
        const manifest = activeLabel ? store.manifests?.[activeLabel] : undefined;
        const signature = manifest?.signature_info ?? null;
        const validationFailures = collectFailures(store);

        let signatureStatus: C2paVerificationResult["signatureStatus"];
        if (!manifest) signatureStatus = "missing";
        else if (validationFailures.length > 0 || store.validation_state === "Invalid")
            signatureStatus = "invalid";
        else if (store.validation_state === "Valid" || store.validation_state === "Trusted")
            signatureStatus = "valid";
        else signatureStatus = "unverified";

        const assertions = (manifest?.assertions ?? [])
            .map((assertion) => nonEmptyString(assertion.label))
            .filter((label): label is string => label !== null)
            .map((label) => ({ label, present: true }));

        return {
            signatureStatus,
            signer: nonEmptyString(signature?.common_name) ?? nonEmptyString(signature?.issuer),
            timestamp: nonEmptyString(signature?.time),
            assertions,
            validationFailures,
            limitations: [
                "Signer and timestamp are reported by the C2PA SDK; trust depends on the configured trust settings.",
            ],
        };
    }
}

function collectFailures(store: SdkManifestStore): { code: string; message: string }[] {
    const entries: SdkStatusEntry[] = [
        ...(store.validation_status ?? []),
        ...(store.validation_results?.activeManifest?.failure ?? []),
    ];
    const failures: { code: string; message: string }[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
        const code = nonEmptyString(entry.code);
        if (!code || seen.has(code)) continue;
        if (entry.success === true) continue;
        seen.add(code);
        failures.push({ code, message: nonEmptyString(entry.explanation) ?? code });
    }
    return failures;
}
