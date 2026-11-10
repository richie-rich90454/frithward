import type { EngineObservation } from "./AnalysisEnginePort.js";

export interface VideoAnalysisPort {
    analyze(input: {
        assetId: string;
        sampleFrames?: number;
        signal: AbortSignal;
    }): Promise<EngineObservation>;
}
