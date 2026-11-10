import type { ModelEntry } from "@frithward/model-registry";
import { describe, expect, it } from "vitest";
import {
    AnalyzeAudioUseCase,
    AnalyzeImageUseCase,
    AnalyzeMultimodalUseCase,
    AnalyzeVideoUseCase,
    MediaCheckController,
    type AudioAnalysisPort,
    type DetectionSignal,
    type EngineObservation,
    type ImageAnalysisPort,
    type MultimodalAnalysisPort,
    type VideoAnalysisPort,
} from "@frithward/media-analysis";

const model: ModelEntry = {
    id: "test-model",
    stage: "experimental",
    license: "Research only",
    intendedUse: "Testing",
    limitations: "Test model limitations",
};

const signal: DetectionSignal = {
    id: "signal-1",
    label: "Inconsistent noise floor",
    detail: "The noise floor changes abruptly in one segment.",
    severity: "medium",
    evidence: "Spectral analysis of the provided file.",
    source: "test-model",
};

function observation(signals: readonly DetectionSignal[] = []): EngineObservation {
    return {
        engineId: model.id,
        signals,
        limitations: ["Test limitation."],
        models: [model],
    };
}

const audioPort: AudioAnalysisPort = { analyze: async () => observation([signal]) };
const imagePort: ImageAnalysisPort = { analyze: async () => observation() };
const videoPort: VideoAnalysisPort = { analyze: async () => observation() };
const multimodalPort: MultimodalAnalysisPort = { analyze: async () => observation() };

function createController(overrides?: {
    audio?: AudioAnalysisPort;
    image?: ImageAnalysisPort;
    video?: VideoAnalysisPort;
    multimodal?: MultimodalAnalysisPort;
}): MediaCheckController {
    return new MediaCheckController({
        audio: new AnalyzeAudioUseCase(overrides?.audio ?? audioPort),
        image: new AnalyzeImageUseCase(overrides?.image ?? imagePort),
        video: new AnalyzeVideoUseCase(overrides?.video ?? videoPort),
        multimodal: new AnalyzeMultimodalUseCase(overrides?.multimodal ?? multimodalPort),
    });
}

describe("MediaCheckController", () => {
    it("presents indicators, limitations, model metadata, and next steps", async () => {
        const controller = createController();
        const viewModel = await controller.analyze({
            kind: "audio",
            assetId: "asset-1",
            signal: new AbortController().signal,
        });
        expect(viewModel.assetId).toBe("asset-1");
        expect(viewModel.kind).toBe("audio");
        expect(viewModel.signals).toHaveLength(1);
        expect(viewModel.signals[0]?.label).toBe(signal.label);
        expect(viewModel.limitations).toContain("Test limitation.");
        expect(viewModel.models).toEqual([
            {
                id: model.id,
                stage: model.stage,
                license: model.license,
                intendedUse: model.intendedUse,
                limitations: model.limitations,
            },
        ]);
        expect(viewModel.nextSteps.length).toBeGreaterThan(0);
        expect(viewModel.error).toBeNull();
    });

    it("dispatches to the requested media kind", async () => {
        const controller = createController();
        for (const kind of ["image", "video", "multimodal"] as const) {
            const viewModel = await controller.analyze({
                kind,
                assetId: "asset-1",
                signal: new AbortController().signal,
            });
            expect(viewModel.kind).toBe(kind);
            expect(viewModel.signals).toHaveLength(0);
        }
    });

    it("records an error when analysis fails", async () => {
        const failing: AudioAnalysisPort = {
            analyze: async () => {
                throw new Error("Engine unavailable.");
            },
        };
        const controller = createController({ audio: failing });
        await expect(
            controller.analyze({
                kind: "audio",
                assetId: "asset-1",
                signal: new AbortController().signal,
            }),
        ).rejects.toThrow("Engine unavailable.");
        expect(controller.getError()).toBe("Analysis failed.");
    });
});
