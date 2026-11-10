import type { ModelEntry } from "@frithward/model-registry";

export interface VoiceProtectionPort {
    protect(input: { assetId: string; audio: ArrayBuffer; signal: AbortSignal }): Promise<{
        artifactId: string;
        method: string;
        limitations: readonly string[];
        models: readonly ModelEntry[];
    }>;
}
