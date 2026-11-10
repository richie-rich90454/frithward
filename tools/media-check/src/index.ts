import {
    AnalyzeAudioUseCase,
    AnalyzeImageUseCase,
    AnalyzeMultimodalUseCase,
    AnalyzeVideoUseCase,
    ExperimentalDetectorAdapter,
    MediaCheckController,
    type AnalysisKind,
    type MediaCheckViewModel,
} from "@frithward/media-analysis";

export * from "@frithward/media-analysis";

export class MediaCheckTool {
    private readonly controller: MediaCheckController;

    public constructor(controller?: MediaCheckController) {
        this.controller =
            controller ??
            new MediaCheckController({
                audio: new AnalyzeAudioUseCase(new ExperimentalDetectorAdapter()),
                image: new AnalyzeImageUseCase(new ExperimentalDetectorAdapter()),
                video: new AnalyzeVideoUseCase(new ExperimentalDetectorAdapter()),
                multimodal: new AnalyzeMultimodalUseCase(new ExperimentalDetectorAdapter()),
            });
    }

    public async check(input: {
        kind: AnalysisKind;
        assetId: string;
        signal?: AbortSignal;
    }): Promise<MediaCheckViewModel> {
        return this.controller.analyze({
            kind: input.kind,
            assetId: input.assetId,
            signal: input.signal ?? new AbortController().signal,
        });
    }

    public summarize(signals: readonly string[]): string {
        if (signals.length === 0) return "No signals detected.";
        return `${signals.length} signal(s) detected: ${signals.join(", ")}. This does not establish authenticity.`;
    }

    public getError(): string | null {
        return this.controller.getError();
    }
}
