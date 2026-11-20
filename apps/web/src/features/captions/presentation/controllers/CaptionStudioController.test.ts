import { describe, expect, it, vi } from "vitest";
import { AppError } from "@frithward/contracts";
import type { CaptionRepository, RecognizedUtterance } from "@frithward/media-core";
import type { LocalModelResult, ModelResolver } from "../../infrastructure/LocalModelResolver";
import {
    LocalStorageCaptionRepository,
    type StorageLike,
} from "../../infrastructure/LocalStorageCaptionRepository.js";
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

function stubResolver(
    result: LocalModelResult = {
        url: "https://example.test/model.bin",
        source: "user",
    },
): ModelResolver & { resolve: ReturnType<typeof vi.fn> } {
    return { resolve: vi.fn().mockResolvedValue(result) };
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
            modelResolver: stubResolver(),
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
            modelResolver: stubResolver(),
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
            modelResolver: stubResolver(),
        });

        await controller.generateCaptions(base);

        expect(controller.getGenerationStatus().stage).toBe("error");
        expect(controller.getGenerationStatus().message).toBe("model load failed");
        expect(controller.getError()).toBe("model load failed");
    });

    it("uses the resolver result when the model URL is blank", async () => {
        const recognizer = fakeRecognizer();
        const factory = vi.fn(() => recognizer);
        const resolver = stubResolver({ url: "/models/whisper-tiny.bin", source: "bundled" });
        const controller = new CaptionStudioController({
            recognizerFactory: factory,
            repository: fakeRepository(),
            modelResolver: resolver,
        });

        await controller.generateCaptions({ ...base, modelUrl: "" });

        expect(resolver.resolve).toHaveBeenCalledWith("");
        expect(factory).toHaveBeenCalledWith({
            modelUrl: "/models/whisper-tiny.bin",
            wasmUrl: base.wasmUrl,
        });
        expect(controller.getGenerationStatus().stage).toBe("done");
    });

    it("surfaces a missing local model without starting a recognizer", async () => {
        const recognizer = fakeRecognizer();
        const factory = vi.fn(() => recognizer);
        const resolver: ModelResolver = {
            resolve: vi.fn().mockRejectedValue(new Error("No local Whisper model is available.")),
        };
        const controller = new CaptionStudioController({
            recognizerFactory: factory,
            repository: fakeRepository(),
            modelResolver: resolver,
        });

        await controller.generateCaptions({ ...base, modelUrl: "" });

        expect(factory).not.toHaveBeenCalled();
        expect(recognizer.start).not.toHaveBeenCalled();
        expect(controller.getGenerationStatus().stage).toBe("error");
        expect(controller.getGenerationStatus().message).toContain("No local Whisper model");
    });
});

describe("CaptionStudioController editing", () => {
    it("adds segments with unique ids, notifies and persists", () => {
        const repository = fakeRepository();
        const controller = new CaptionStudioController({ repository });
        const listener = vi.fn();
        controller.subscribe(listener);

        controller.addSegment({ startMs: 0, endMs: 1200, text: "Hello", speakerId: "Ann" });
        controller.addSegment({ startMs: 1200, endMs: 2400, text: "World" });

        const segments = controller.getViewModel().segments;
        expect(segments).toHaveLength(2);
        expect(segments[0]).toMatchObject({
            startMs: 0,
            endMs: 1200,
            text: "Hello",
            speakerId: "Ann",
        });
        expect(segments[1]?.speakerId).toBeNull();
        expect(segments[1]?.id).not.toBe(segments[0]?.id);
        expect(listener).toHaveBeenCalledTimes(2);
        expect(repository.save).toHaveBeenCalledTimes(2);
        expect(controller.getError()).toBeNull();
    });

    it("captures domain validation errors into the error state without throwing", () => {
        const controller = new CaptionStudioController({ repository: fakeRepository() });

        expect(() => controller.addSegment({ startMs: 100, endMs: 50, text: "Bad" })).not.toThrow();

        expect(controller.getError()).toContain("Segment end must exceed start.");
        expect(controller.getViewModel().segments).toHaveLength(0);
        expect(controller.canUndo()).toBe(false);
    });

    it("removes a segment and reports a missing id", () => {
        const repository = fakeRepository();
        const controller = new CaptionStudioController({ repository });
        controller.addSegment({ startMs: 0, endMs: 1000, text: "Hello" });
        const id = controller.getViewModel().segments[0]?.id;
        expect(id).toBeDefined();

        controller.removeSegment(id as string);
        expect(controller.getViewModel().segments).toHaveLength(0);
        expect(controller.getError()).toBeNull();

        controller.removeSegment(id as string);
        expect(controller.getError()).toContain("not found");
    });

    it("retimes a segment through the editor and saves", async () => {
        const repository = fakeRepository();
        const controller = new CaptionStudioController({ repository });
        controller.addSegment({ startMs: 0, endMs: 1000, text: "Hello" });
        const id = controller.getViewModel().segments[0]?.id as string;

        await controller.retimeSegment({ segmentId: id, startMs: 500, endMs: 1500 });

        expect(controller.getViewModel().segments[0]).toMatchObject({
            startMs: 500,
            endMs: 1500,
        });
        expect(repository.save).toHaveBeenCalled();
        expect(controller.getError()).toBeNull();
    });
});

describe("CaptionStudioController exportSubtitles", () => {
    function seeded() {
        const controller = new CaptionStudioController({ repository: fakeRepository() });
        controller.addSegment({ startMs: 0, endMs: 1200, text: "Hello", speakerId: "Ann" });
        controller.addSegment({ startMs: 1200, endMs: 2400, text: "World" });
        return controller;
    }

    it("exports VTT with cues, timestamps and speaker tags", () => {
        const output = seeded().exportSubtitles("vtt");

        expect(output.startsWith("WEBVTT\n")).toBe(true);
        expect(output).toContain("00:00:00.000 --> 00:00:01.200");
        expect(output).toContain("<v Ann>Hello</v>");
        expect(output).toContain("World");
    });

    it("exports SRT with numbered cues and comma timestamps", () => {
        const output = seeded().exportSubtitles("srt");

        expect(output.startsWith("1\n00:00:00,000 --> 00:00:01,200\nHello\n")).toBe(true);
        expect(output).toContain("2\n00:00:01,200 --> 00:00:02,400\nWorld");
        expect(output).not.toContain("<v Ann>");
    });

    it("throws a typed error when there are no segments", () => {
        const controller = new CaptionStudioController({ repository: fakeRepository() });

        let thrown: unknown;
        try {
            controller.exportSubtitles("vtt");
        } catch (cause) {
            thrown = cause;
        }

        expect(thrown).toBeInstanceOf(AppError);
        expect((thrown as AppError).code).toBe("VALIDATION_FAILED");
        expect(controller.getError()).toContain("no segments");
    });
});

describe("CaptionStudioController search and replace", () => {
    function seeded() {
        const repository = fakeRepository();
        const controller = new CaptionStudioController({ repository });
        controller.addSegment({ startMs: 0, endMs: 1000, text: "Hello world" });
        controller.addSegment({ startMs: 1000, endMs: 2000, text: "Goodbye world" });
        return { controller, repository };
    }

    it("finds matching segments and ignores blank queries", () => {
        const { controller } = seeded();

        expect(controller.search("world")).toHaveLength(2);
        expect(controller.search("HELLO").map((segment) => segment.text)).toEqual(["Hello world"]);
        expect(controller.search("")).toHaveLength(0);
        expect(controller.search("missing")).toHaveLength(0);
    });

    it("replaces text in matching segments through the editor", async () => {
        const { controller, repository } = seeded();
        const listener = vi.fn();
        controller.subscribe(listener);
        vi.mocked(repository.save).mockClear();

        await controller.replaceAll("world", "there");

        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual([
            "Hello there",
            "Goodbye there",
        ]);
        expect(repository.save).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenCalled();
        expect(controller.getError()).toBeNull();
    });

    it("rejects an empty search term without touching segments", async () => {
        const { controller } = seeded();

        await controller.replaceAll("", "x");

        expect(controller.getError()).toBe("Enter text to replace.");
        expect(controller.getViewModel().segments[0]?.text).toBe("Hello world");
    });
});

describe("CaptionStudioController undo and redo", () => {
    it("restores prior states and reapplies them", () => {
        const controller = new CaptionStudioController({ repository: fakeRepository() });
        expect(controller.canUndo()).toBe(false);
        expect(controller.canRedo()).toBe(false);

        controller.addSegment({ startMs: 0, endMs: 1000, text: "one" });
        controller.addSegment({ startMs: 1000, endMs: 2000, text: "two" });
        expect(controller.getViewModel().segments).toHaveLength(2);

        controller.undo();
        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual(["one"]);
        expect(controller.canRedo()).toBe(true);

        controller.undo();
        expect(controller.getViewModel().segments).toHaveLength(0);
        expect(controller.canUndo()).toBe(false);

        controller.redo();
        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual(["one"]);
        controller.redo();
        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual([
            "one",
            "two",
        ]);
        expect(controller.canRedo()).toBe(false);
    });

    it("undoes a deletion triggered by the Delete shortcut action", () => {
        const controller = new CaptionStudioController({ repository: fakeRepository() });
        controller.addSegment({ startMs: 0, endMs: 1000, text: "keep" });
        controller.addSegment({ startMs: 1000, endMs: 2000, text: "delete me" });
        const id = controller.getViewModel().segments[1]?.id as string;

        controller.removeSegment(id);
        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual(["keep"]);

        controller.undo();
        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual([
            "keep",
            "delete me",
        ]);
    });

    it("clears the redo stack on a new edit", () => {
        const controller = new CaptionStudioController({ repository: fakeRepository() });
        controller.addSegment({ startMs: 0, endMs: 1000, text: "one" });
        controller.addSegment({ startMs: 1000, endMs: 2000, text: "two" });

        controller.undo();
        expect(controller.canRedo()).toBe(true);
        controller.addSegment({ startMs: 2000, endMs: 3000, text: "three" });

        expect(controller.canRedo()).toBe(false);
        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual([
            "one",
            "three",
        ]);
    });

    it("bounds the undo history to 50 entries", () => {
        const controller = new CaptionStudioController({ repository: fakeRepository() });
        for (let index = 0; index < 51; index += 1) {
            controller.addSegment({
                startMs: index * 2000,
                endMs: index * 2000 + 1000,
                text: `seg-${index}`,
            });
        }
        expect(controller.getViewModel().segments).toHaveLength(51);

        for (let index = 0; index < 50; index += 1) controller.undo();

        expect(controller.getViewModel().segments.map((segment) => segment.text)).toEqual([
            "seg-0",
        ]);
        expect(controller.canUndo()).toBe(false);
    });
});

describe("CaptionStudioController persistence", () => {
    function memoryStorage(): StorageLike {
        const values = new Map<string, string>();
        return {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => {
                values.set(key, value);
            },
        };
    }

    it("restores the locally saved project through hydrate()", async () => {
        const storage = memoryStorage();
        const first = new CaptionStudioController({
            repository: new LocalStorageCaptionRepository(storage),
        });
        first.addSegment({ startMs: 0, endMs: 1000, text: "Persisted caption" });

        const second = new CaptionStudioController({
            repository: new LocalStorageCaptionRepository(storage),
        });
        expect(second.getViewModel().segments).toHaveLength(0);

        await second.hydrate();

        expect(second.getViewModel().segments).toMatchObject([
            { startMs: 0, endMs: 1000, text: "Persisted caption" },
        ]);
        expect(second.canUndo()).toBe(false);
        expect(second.getError()).toBeNull();
    });

    it("leaves a fresh project untouched when nothing was stored", async () => {
        const controller = new CaptionStudioController({
            repository: new LocalStorageCaptionRepository(memoryStorage()),
        });

        await controller.hydrate();

        expect(controller.getViewModel().segments).toHaveLength(0);
        expect(controller.getError()).toBeNull();
    });

    it("surfaces corrupt saved state instead of fabricating captions", async () => {
        const storage = memoryStorage();
        storage.setItem("frithward.caption.caption-studio", "{not json");
        const controller = new CaptionStudioController({
            repository: new LocalStorageCaptionRepository(storage),
        });

        await controller.hydrate();

        expect(controller.getError()).toContain("not valid JSON");
        expect(controller.getViewModel().segments).toHaveLength(0);
    });
});
