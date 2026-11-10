import { AppError } from "@frithward/contracts";
import type { AnalyzeAudioUseCase } from "../../application/AnalyzeAudioUseCase.js";
import type { AnalyzeImageUseCase } from "../../application/AnalyzeImageUseCase.js";
import type { AnalyzeMultimodalUseCase } from "../../application/AnalyzeMultimodalUseCase.js";
import type { AnalyzeVideoUseCase } from "../../application/AnalyzeVideoUseCase.js";
import type { AnalysisKind, DetectionReport } from "../../domain/DetectionReport.js";
import { MediaCheckPresenter } from "../presenters/MediaCheckPresenter.js";
import { MediaCheckViewModel } from "../view-models/MediaCheckViewModel.js";

export class MediaCheckController {
    private readonly audio: AnalyzeAudioUseCase;
    private readonly image: AnalyzeImageUseCase;
    private readonly video: AnalyzeVideoUseCase;
    private readonly multimodal: AnalyzeMultimodalUseCase;
    private readonly presenter: MediaCheckPresenter;
    private error: string | null;

    public constructor(input: {
        audio: AnalyzeAudioUseCase;
        image: AnalyzeImageUseCase;
        video: AnalyzeVideoUseCase;
        multimodal: AnalyzeMultimodalUseCase;
        presenter?: MediaCheckPresenter;
    }) {
        this.audio = input.audio;
        this.image = input.image;
        this.video = input.video;
        this.multimodal = input.multimodal;
        this.presenter = input.presenter ?? new MediaCheckPresenter();
        this.error = null;
    }

    public async analyze(input: {
        kind: AnalysisKind;
        assetId: string;
        signal: AbortSignal;
    }): Promise<MediaCheckViewModel> {
        try {
            const report = await this.executeUseCase(input.kind, input.assetId, input.signal);
            this.error = null;
            return this.presenter.present(report);
        } catch (cause) {
            this.error = cause instanceof AppError ? cause.message : "Analysis failed.";
            throw cause;
        }
    }

    public getError(): string | null {
        return this.error;
    }

    private async executeUseCase(
        kind: AnalysisKind,
        assetId: string,
        signal: AbortSignal,
    ): Promise<DetectionReport> {
        switch (kind) {
            case "audio":
                return this.audio.execute({ assetId, signal });
            case "image":
                return this.image.execute({ assetId, signal });
            case "video":
                return this.video.execute({ assetId, signal });
            case "multimodal":
                return this.multimodal.execute({ assetId, signal });
            default:
                throw new AppError("VALIDATION_FAILED", `Unsupported analysis kind: ${kind}`);
        }
    }
}
