import type { EngineObservation } from "./AnalysisEnginePort.js";

export interface ImageAnalysisPort {
    analyze(input: { assetId: string; signal: AbortSignal }): Promise<EngineObservation>;
}
