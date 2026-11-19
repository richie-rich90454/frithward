import type {
    C2paAssertionSummary,
    C2paSignatureStatus,
    C2paValidationFailure,
} from "../domain/C2paManifest.js";

/** The result of a cryptographic C2PA verification performed by an external SDK. */
export interface C2paVerificationResult {
    signatureStatus: C2paSignatureStatus;
    signer: string | null;
    timestamp: string | null;
    assertions: readonly C2paAssertionSummary[];
    validationFailures: readonly C2paValidationFailure[];
    limitations: readonly string[];
}

/**
 * Port for verifying a C2PA asset with the official SDK.
 * Implementations must not report a signature as valid unless the SDK verified it.
 */
export interface C2paVerificationPort {
    verify(asset: unknown): Promise<C2paVerificationResult>;
}
