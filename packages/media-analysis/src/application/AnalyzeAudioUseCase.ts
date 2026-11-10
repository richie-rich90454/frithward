import { AppError } from "@frithward/contracts";
import { DetectionReport } from "../domain/DetectionReport.js";
import type { AudioAnalysisPort } from "../ports/AudioAnalysisPort.js";

export class AnalyzeAudioUseCase {
    private readonly port: AudioAnalysisPort;

    public constructor(port: AudioAnalysisPort) {
        this.port = port;
    }

    public async execute(input: {
        assetId: string;
        language?: string;
        signal: AbortSignal;
    }): Promise<DetectionReport> {
        if (input.signal.aborted) throw new AppError("CANCELLED", "Audio analysis cancelled.");
        const observation = await this.port.analyze({
            assetId: input.assetId,
            ...(input.language === undefined ? {} : { language: input.language }),
            signal: input.signal,
        });
        return new DetectionReport({
            assetId: input.assetId,
            kind: "audio",
            indicators: observation.signals,
            limitations: observation.limitations,
            models: observation.models,
        });
    }
}
