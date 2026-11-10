import { AppError } from "@frithward/contracts";
import type { ModelEntry } from "@frithward/model-registry";
import type { AnalysisEnginePort, EngineObservation } from "../ports/AnalysisEnginePort.js";

export interface HostedAnalysisConfig {
    readonly endpoint: string;
    readonly timeoutMs: number;
    readonly model?: ModelEntry;
}

export class HostedAnalysisAdapter implements AnalysisEnginePort {
    public readonly engineId: string;
    public readonly endpoint: string;
    public readonly timeoutMs: number;
    public readonly model: ModelEntry | null;
    private disposed = false;

    public constructor(config: HostedAnalysisConfig, engineId = "hosted-analysis") {
        if (config.endpoint.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Hosted analysis endpoint required.");
        if (!Number.isInteger(config.timeoutMs) || config.timeoutMs <= 0) {
            throw new AppError(
                "VALIDATION_FAILED",
                "Hosted analysis timeout must be a positive integer.",
            );
        }
        this.endpoint = config.endpoint;
        this.timeoutMs = config.timeoutMs;
        this.model = config.model ?? null;
        this.engineId = engineId;
    }

    public async analyze(input: {
        assetId: string;
        signal: AbortSignal;
    }): Promise<EngineObservation> {
        this.assertActive();
        if (input.assetId.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Asset id required.");
        if (input.signal.aborted) throw new AppError("CANCELLED", "Analysis cancelled.");
        if (this.model === null) {
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "Hosted analysis requires a registered model card.",
            );
        }
        // shortcut: hosted inference bridge is not wired yet; replace with the runtime client.
        throw new AppError(
            "EXTERNAL_UNAVAILABLE",
            `Hosted analysis endpoint ${this.endpoint} is not reachable from this build.`,
        );
    }

    public dispose(): void {
        this.disposed = true;
    }

    private assertActive(): void {
        if (this.disposed) throw new AppError("CANCELLED", "Hosted analysis adapter is disposed.");
    }
}
