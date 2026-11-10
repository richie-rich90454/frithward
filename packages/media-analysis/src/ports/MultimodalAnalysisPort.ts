import type { EngineObservation } from "./AnalysisEnginePort.js";

export interface MultimodalAnalysisPort {
    analyze(input: {
        assetId: string;
        modalities?: readonly ("audio" | "image" | "video")[];
        signal: AbortSignal;
    }): Promise<EngineObservation>;
}
