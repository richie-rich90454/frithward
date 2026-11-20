import type {
    C2paVerificationPort,
    C2paVerificationResult,
} from "../ports/C2paVerificationPort.js";

/** The only SDK surface the adapter needs. Both the Node and WASM readers satisfy it. */
export interface SdkManifestReader {
    json(): unknown;
}

export type C2paSdkUnavailableReason = "package-missing" | "native-binary-missing" | "load-failed";

function classifySdkError(cause: unknown): C2paSdkUnavailableReason {
    const code = (cause as { code?: unknown } | null)?.code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") return "package-missing";
    const message = cause instanceof Error ? cause.message : "";
    if (/\.node\b|dlopen|bindings file|cannot open shared object|Win32 error/i.test(message))
        return "native-binary-missing";
    return "load-failed";
}

function platformLabel(): string {
    const nodeProcess = (
        globalThis as unknown as { process?: { platform?: string; arch?: string } }
    ).process;
    if (!nodeProcess) return "this environment";
    return `${nodeProcess.platform ?? "unknown"}/${nodeProcess.arch ?? "unknown"}`;
}

/** Raised when the official C2PA SDK cannot be loaded. Verification must not be faked. */
export class C2paSdkUnavailableError extends Error {
    public readonly code = "EXTERNAL_UNAVAILABLE";
    public readonly reason: C2paSdkUnavailableReason;

    public constructor(
        cause?: unknown,
        reason: C2paSdkUnavailableReason = classifySdkError(cause),
    ) {
        super(
            "The official C2PA SDK (@contentauth/c2pa-node) is required for signature " +
                "verification but could not be loaded.",
        );
        this.name = "C2paSdkUnavailableError";
        this.reason = reason;
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
type SdkLoader = (source: SdkSource) => Promise<SdkManifestReader | null>;

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
    const bufferFactory = (
        globalThis as unknown as {
            Buffer?: { from(value: Uint8Array): Uint8Array };
        }
    ).Buffer;
    return { buffer: bufferFactory ? bufferFactory.from(source.buffer) : source.buffer };
}

// Built at runtime so bundlers cannot inline the Node-only SDK into browser builds.
const NODE_SDK_SPECIFIER = ["@contentauth", "c2pa-node"].join("/");

async function loadReader(source: SdkSource): Promise<SdkManifestReader | null> {
    let sdk: typeof import("@contentauth/c2pa-node");
    try {
        sdk = (await import(/* @vite-ignore */ NODE_SDK_SPECIFIER)) as typeof import("@contentauth/c2pa-node");
    } catch (cause) {
        throw new C2paSdkUnavailableError(cause);
    }
    if (typeof sdk?.Reader?.fromAsset !== "function") {
        throw new C2paSdkUnavailableError(
            new Error("SDK module does not expose Reader.fromAsset"),
            "load-failed",
        );
    }
    type SdkAsset = Parameters<typeof sdk.Reader.fromAsset>[0];
    return await sdk.Reader.fromAsset(toSdkAsset(source) as SdkAsset);
}

/**
 * Verifies C2PA assets with the official Adobe/contentauth SDK.
 * Every result here is backed by the SDK's cryptographic validation.
 */
export class C2paSdkAdapter implements C2paVerificationPort {
    private available: boolean;

    public constructor(private readonly loader: SdkLoader = loadReader) {
        // An injected loader is a deliberate stand-in. The default loader is only
        // considered available once a real SDK call has succeeded.
        this.available = loader !== loadReader;
    }

    /** True when this adapter can reach an SDK (or an injected stand-in) for verification. */
    public isAvailable(): boolean {
        return this.available;
    }

    public async verify(asset: unknown): Promise<C2paVerificationResult> {
        const source = toSourceAsset(asset);
        let reader: SdkManifestReader | null;
        try {
            reader = await this.loader(source);
            this.available = true;
        } catch (cause) {
            this.available = false;
            const detail = cause instanceof Error ? cause.message : "Unknown SDK error.";
            const reason = cause instanceof C2paSdkUnavailableError ? cause.reason : "load-failed";
            return {
                signatureStatus: "unverified",
                signer: null,
                timestamp: null,
                assertions: [],
                validationFailures: [{ code: "sdk.error", message: detail }],
                limitations: [
                    `C2PA signature verification is unavailable on ${platformLabel()} (${reason}): ${detail}`,
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
                "The C2PA SDK verified claim-signature integrity, assertion and data hashes, and the timestamp where reported. Signer and timestamp come from the SDK; trust depends on the configured trust settings. An untrusted certificate is reported as a validation failure, and no server-side trust decision is made.",
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
