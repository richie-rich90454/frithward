import { AppError } from "@frithward/contracts";
import type { ModelEntry } from "@frithward/model-registry";
import { AnalysisLimitations } from "../domain/AnalysisLimitations.js";
import type { DetectionSignal } from "../domain/DetectionSignal.js";
import type { AnalysisEnginePort, EngineObservation } from "../ports/AnalysisEnginePort.js";

export const DEFAULT_EXPERIMENTAL_MODEL: ModelEntry = Object.freeze({
    id: "experimental-media-detector",
    stage: "experimental",
    license: "Research only; not for production decisions.",
    intendedUse: "Investigative media analysis with human review.",
    limitations: "Experimental detector; output is evidence, not proof.",
});

export class ExperimentalDetectorAdapter implements AnalysisEnginePort {
    public readonly engineId: string;
    private readonly model: ModelEntry;
    private readonly detector: ((input: { assetId: string }) => readonly DetectionSignal[]) | null;
    private disposed = false;

    public constructor(
        model: ModelEntry = DEFAULT_EXPERIMENTAL_MODEL,
        detector?: (input: { assetId: string }) => readonly DetectionSignal[],
    ) {
        if (model.stage !== "experimental" && model.stage !== "candidate") {
            throw new AppError(
                "VALIDATION_FAILED",
                "Experimental detector requires an experimental or candidate model card.",
            );
        }
        this.model = model;
        this.detector = detector ?? null;
        this.engineId = model.id;
    }

    public async analyze(input: {
        assetId: string;
        signal: AbortSignal;
    }): Promise<EngineObservation> {
        this.assertActive();
        if (input.assetId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset id required.");
        if (input.signal.aborted) throw new AppError("CANCELLED", "Analysis cancelled.");
        const signals = this.detector?.({ assetId: input.assetId }) ?? [];
        return {
            engineId: this.engineId,
            signals,
            limitations: AnalysisLimitations.merge(
                [this.model.limitations],
                [
                    "Experimental detector output is evidence for review, not proof.",
                    "Detector coverage is limited to the registered model's training distribution.",
                ],
            ),
            models: [this.model],
        };
    }

    public dispose(): void {
        this.disposed = true;
    }

    private assertActive(): void {
        if (this.disposed) {
            throw new AppError("CANCELLED", "Experimental detector adapter is disposed.");
        }
    }
}
