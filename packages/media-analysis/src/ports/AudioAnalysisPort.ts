import type { EngineObservation } from "./AnalysisEnginePort.js";

export interface AudioAnalysisPort {
    analyze(input: {
        assetId: string;
        language?: string;
        signal: AbortSignal;
    }): Promise<EngineObservation>;
}
