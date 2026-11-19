import { describe, expect, it, vi } from "vitest";
import type { CaptionRepository, RecognizedUtterance } from "@frithward/media-core";
import {
    CaptionStudioController,
    type CaptionGenerationRecognizer,
} from "./CaptionStudioController";

const utterances: readonly RecognizedUtterance[] = [
    { startMs: 0, endMs: 1200, text: "Hello world", speakerId: null },
];

function fakeRepository(): CaptionRepository {
    return { save: vi.fn().mockResolvedValue(undefined), load: vi.fn().mockResolvedValue(null) };
}

function fakeRecognizer(): CaptionGenerationRecognizer & {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
} {
    return {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue(utterances),
    };
}

describe("CaptionStudioController.generateCaptions", () => {
    const base = {
        audio: new ArrayBuffer(4),
        modelUrl: "https://example.test/model.bin",
        wasmUrl: "https://example.test/whisper.wasm",
        language: "en",
    };

    it("reports honest stages and puts recognized utterances on the project", async () => {
        const recognizer = fakeRecognizer();
        const repository = fakeRepository();
        const controller = new CaptionStudioController({
            recognizerFactory: () => recognizer,
            repository,
        });
        const stages: string[] = [];
        controller.subscribe(() => stages.push(controller.getGenerationStatus().stage));

        await controller.generateCaptions(base);

        expect(stages).toEqual(["loading model", "transcribing", "done"]);
        expect(recognizer.start).toHaveBeenCalledOnce();
        expect(recognizer.stop).toHaveBeenCalledOnce();
        expect(recognizer.recognize).toHaveBeenCalledWith({
            audio: base.audio,
            language: "en",
            signal: expect.any(AbortSignal),
        });
        expect(repository.save).toHaveBeenCalledOnce();
        expect(controller.getViewModel().segments).toMatchObject([
            { startMs: 0, endMs: 1200, text: "Hello world" },
        ]);
        expect(controller.getGenerationStatus().stage).toBe("done");
    });

    it("does not transcribe when the caller signal is already aborted", async () => {
        const recognizer = fakeRecognizer();
        const controller = new CaptionStudioController({
            recognizerFactory: () => recognizer,
            repository: fakeRepository(),
        });

        await controller.generateCaptions({
            ...base,
            signal: AbortSignal.abort(),
        });

        expect(recognizer.recognize).not.toHaveBeenCalled();
        expect(controller.getGenerationStatus().stage).toBe("cancelled");
    });

    it("reports failures without inventing progress", async () => {
        const recognizer = fakeRecognizer();
        vi.mocked(recognizer.recognize).mockRejectedValue(new Error("model load failed"));
        const controller = new CaptionStudioController({
            recognizerFactory: () => recognizer,
            repository: fakeRepository(),
        });

        await controller.generateCaptions(base);

        expect(controller.getGenerationStatus().stage).toBe("error");
        expect(controller.getGenerationStatus().message).toBe("model load failed");
        expect(controller.getError()).toBe("model load failed");
    });
});
