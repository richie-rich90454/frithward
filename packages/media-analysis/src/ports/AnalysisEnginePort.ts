import type { ModelEntry } from "@frithward/model-registry";
import type { DetectionSignal } from "../domain/DetectionSignal.js";

export interface EngineObservation {
    readonly engineId: string;
    readonly signals: readonly DetectionSignal[];
    readonly limitations: readonly string[];
    readonly models: readonly ModelEntry[];
}

export interface AnalysisEnginePort {
    readonly engineId: string;
    analyze(input: { assetId: string; signal: AbortSignal }): Promise<EngineObservation>;
}
