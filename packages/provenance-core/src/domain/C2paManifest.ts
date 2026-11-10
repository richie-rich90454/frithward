export interface C2paValidationEntry {
    code: string;
    message?: string;
    success?: boolean;
}

export interface C2paSignatureInfo {
    alg?: string;
    issuer?: string;
    signer?: string;
    time?: string;
    timestamp?: string;
    serialNumber?: string;
}

export interface C2paAssertion {
    label: string;
    data?: unknown;
}

export interface C2paManifest {
    claimGenerator?: string;
    title?: string;
    format?: string;
    instanceID?: string;
    createdAt?: string;
    assertions?: readonly C2paAssertion[];
    signature?: C2paSignatureInfo | null;
    validations?: readonly C2paValidationEntry[];
    validationStatus?: readonly C2paValidationEntry[];
    [key: string]: unknown;
}

export type C2paSignatureStatus = "valid" | "invalid" | "missing" | "unverified";

export interface C2paAssertionSummary {
    label: string;
    present: boolean;
}

export interface C2paValidationFailure {
    code: string;
    message: string;
}

export interface C2paInspectionResult {
    signatureStatus: C2paSignatureStatus;
    signer: string | null;
    signedAt: string | null;
    assertions: readonly C2paAssertionSummary[];
    assetHash: string | null;
    validationFailures: readonly C2paValidationFailure[];
    missingInfo: readonly string[];
    summary: string;
    limitations: readonly string[];
}
