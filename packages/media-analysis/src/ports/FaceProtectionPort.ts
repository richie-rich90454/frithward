import type { ModelEntry } from "@frithward/model-registry";

export interface FaceProtectionPort {
    protect(input: { assetId: string; image: ArrayBuffer; signal: AbortSignal }): Promise<{
        artifactId: string;
        method: string;
        limitations: readonly string[];
        models: readonly ModelEntry[];
    }>;
}
