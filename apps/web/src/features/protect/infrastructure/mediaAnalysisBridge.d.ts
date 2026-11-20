// Structural declarations for the workspace modules loaded by mediaAnalysisBridge.js.
// shortcut: kept local because the web tsconfig cannot include package sources directly.

export interface ProtectionOutcome {
    readonly artifactId: string;
    readonly method: string;
    readonly limitations: readonly string[];
    readonly models: readonly unknown[];
}

export interface VoiceProtectionPort {
    protect(input: {
        assetId: string;
        audio: ArrayBuffer;
        signal: AbortSignal;
    }): Promise<ProtectionOutcome>;
}

export interface FaceProtectionPort {
    protect(input: {
        assetId: string;
        image: ArrayBuffer;
        signal: AbortSignal;
    }): Promise<ProtectionOutcome>;
}

export interface ProtectionResult {
    readonly assetId: string;
    readonly status: "applied" | "unavailable";
    readonly method: string;
    readonly artifactId: string | null;
    readonly limitations: readonly string[];
    readonly models: readonly unknown[];
    readonly nextSteps: readonly string[];
    readonly summary: string;
    readonly experimental: boolean;
}

export declare class VoiceProtectionPolicy {
    readonly requireConsent: boolean;
    readonly allowExperimentalProtection: boolean;
    constructor(input?: { requireConsent?: boolean; allowExperimentalProtection?: boolean });
}

export declare class FaceProtectionPolicy {
    readonly requireConsent: boolean;
    readonly allowExperimentalProtection: boolean;
    readonly minFaceSizePx: number;
    constructor(input?: {
        requireConsent?: boolean;
        allowExperimentalProtection?: boolean;
        minFaceSizePx?: number;
    });
}

export declare class ProtectVoiceUseCase {
    constructor(port: VoiceProtectionPort, policy?: VoiceProtectionPolicy);
    execute(input: {
        assetId: string;
        audio: ArrayBuffer;
        consentDocumented: boolean;
        signal: AbortSignal;
    }): Promise<ProtectionResult>;
}

export declare class ProtectFaceUseCase {
    constructor(port: FaceProtectionPort, policy?: FaceProtectionPolicy);
    execute(input: {
        assetId: string;
        image: ArrayBuffer;
        consentDocumented: boolean;
        faceSizePx?: number;
        signal: AbortSignal;
    }): Promise<ProtectionResult>;
}

export interface ProtectedMediaArtifact {
    readonly id: string;
    readonly byteSize: number;
    readonly method: string;
}

export interface ProtectedMediaExport {
    readonly assetId: string;
    readonly artifacts: readonly ProtectedMediaArtifact[];
    readonly manifest: string;
    readonly limitations: readonly string[];
}

export declare class ProtectedMediaExporter {
    export(input: {
        assetId: string;
        artifacts: readonly ProtectedMediaArtifact[];
    }): ProtectedMediaExport;
}
