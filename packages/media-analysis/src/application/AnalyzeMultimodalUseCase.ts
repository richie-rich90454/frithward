import { AppError } from "@frithward/contracts";
import { DetectionReport } from "../domain/DetectionReport.js";
import type { MultimodalAnalysisPort } from "../ports/MultimodalAnalysisPort.js";

export class AnalyzeMultimodalUseCase {
    private readonly port: MultimodalAnalysisPort;

    public constructor(port: MultimodalAnalysisPort) {
        this.port = port;
    }

    public async execute(input: {
        assetId: string;
        modalities?: readonly ("audio" | "image" | "video")[];
        signal: AbortSignal;
    }): Promise<DetectionReport> {
        if (input.signal.aborted) throw new AppError("CANCELLED", "Multimodal analysis cancelled.");
        const observation = await this.port.analyze({
            assetId: input.assetId,
            ...(input.modalities === undefined ? {} : { modalities: input.modalities }),
            signal: input.signal,
        });
        return new DetectionReport({
            assetId: input.assetId,
            kind: "multimodal",
            indicators: observation.signals,
            limitations: observation.limitations,
            models: observation.models,
        });
    }
}
