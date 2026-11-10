import { AppError } from "@frithward/contracts";
import { DetectionReport } from "../domain/DetectionReport.js";
import type { ImageAnalysisPort } from "../ports/ImageAnalysisPort.js";

export class AnalyzeImageUseCase {
    private readonly port: ImageAnalysisPort;

    public constructor(port: ImageAnalysisPort) {
        this.port = port;
    }

    public async execute(input: {
        assetId: string;
        signal: AbortSignal;
    }): Promise<DetectionReport> {
        if (input.signal.aborted) throw new AppError("CANCELLED", "Image analysis cancelled.");
        const observation = await this.port.analyze(input);
        return new DetectionReport({
            assetId: input.assetId,
            kind: "image",
            indicators: observation.signals,
            limitations: observation.limitations,
            models: observation.models,
        });
    }
}
