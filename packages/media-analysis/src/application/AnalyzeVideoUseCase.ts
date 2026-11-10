import { AppError } from "@frithward/contracts";
import { DetectionReport } from "../domain/DetectionReport.js";
import type { VideoAnalysisPort } from "../ports/VideoAnalysisPort.js";

export class AnalyzeVideoUseCase {
    private readonly port: VideoAnalysisPort;

    public constructor(port: VideoAnalysisPort) {
        this.port = port;
    }

    public async execute(input: {
        assetId: string;
        sampleFrames?: number;
        signal: AbortSignal;
    }): Promise<DetectionReport> {
        if (input.signal.aborted) throw new AppError("CANCELLED", "Video analysis cancelled.");
        const observation = await this.port.analyze({
            assetId: input.assetId,
            ...(input.sampleFrames === undefined ? {} : { sampleFrames: input.sampleFrames }),
            signal: input.signal,
        });
        return new DetectionReport({
            assetId: input.assetId,
            kind: "video",
            indicators: observation.signals,
            limitations: observation.limitations,
            models: observation.models,
        });
    }
}
