import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => ({
    transcribe: vi.fn(),
    transcribePCM: vi.fn(),
    dispose: vi.fn(),
}));

// No real GPU, model download, or Web Worker is used in these tests.
vi.mock("browser-whisper", () => ({
    BrowserWhisper: class {
        public transcribe = engine.transcribe;
        public transcribePCM = engine.transcribePCM;
        public dispose = engine.dispose;
    },
}));

import { BrowserWhisper } from "browser-whisper";
import { BrowserWhisperAdapter } from "../../../../../../packages/media-core/src/infrastructure/browser/BrowserWhisperAdapter.js";

function setWebGpu(available: boolean): void {
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        writable: true,
        value: available ? { gpu: {} } : {},
    });
}

const audio = (): ArrayBuffer => new ArrayBuffer(4);
const recognizeInput = () => ({
    audio: audio(),
    language: "en",
    signal: new AbortController().signal,
});

describe("BrowserWhisperAdapter", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setWebGpu(true);
    });

    afterEach(() => {
        setWebGpu(false);
    });

    it("maps browser-whisper segments to utterances and forwards status", async () => {
        engine.transcribePCM.mockImplementation((_samples, options) => {
            options?.onProgress?.({ stage: "transcribing", progress: 0.5 });
            return {
                collect: vi.fn().mockResolvedValue([
                    { text: "Hello world", start: 0, end: 1.234 },
                    { text: "Second", start: 1.5, end: 2 },
                ]),
                cancel: vi.fn(),
            };
        });
        const onStatus = vi.fn();
        const adapter = new BrowserWhisperAdapter({
            engine: new BrowserWhisper(),
            language: "en",
            onStatus,
        });

        const result = await adapter.recognize(recognizeInput());

        expect(result).toEqual([
            { startMs: 0, endMs: 1234, text: "Hello world", speakerId: null },
            { startMs: 1500, endMs: 2000, text: "Second", speakerId: null },
        ]);
        expect(engine.transcribePCM).toHaveBeenCalledOnce();
        expect(onStatus).toHaveBeenCalledWith("transcribing");
        await adapter.stop();
        expect(engine.dispose).toHaveBeenCalledOnce();
    });

    it("decodes a normal audio upload through browser-whisper's file API", async () => {
        engine.transcribe.mockReturnValue({
            collect: vi.fn().mockResolvedValue([{ text: "Hi", start: 0, end: 0.5 }]),
            cancel: vi.fn(),
        });
        const adapter = new BrowserWhisperAdapter({
            engine: new BrowserWhisper(),
            fileType: "audio/mpeg",
        });

        const result = await adapter.recognize(recognizeInput());

        expect(result).toEqual([{ startMs: 0, endMs: 500, text: "Hi", speakerId: null }]);
        const [file] = engine.transcribe.mock.calls[0] as [File];
        expect(file.type).toBe("audio/mpeg");
        expect(engine.transcribePCM).not.toHaveBeenCalled();
    });

    it("fails honestly with EXTERNAL_UNAVAILABLE when WebGPU is missing", async () => {
        setWebGpu(false);
        const adapter = new BrowserWhisperAdapter({ engine: new BrowserWhisper() });

        await expect(adapter.recognize(recognizeInput())).rejects.toMatchObject({
            code: "EXTERNAL_UNAVAILABLE",
            message: expect.stringContaining("WebGPU"),
        });
        expect(engine.transcribePCM).not.toHaveBeenCalled();
    });

    it("cancels the stream and reports CANCELLED on abort", async () => {
        let rejectCollect!: (reason?: unknown) => void;
        const cancel = vi.fn(() => rejectCollect(new Error("cancelled")));
        engine.transcribePCM.mockReturnValue({
            collect: vi.fn(() => new Promise((_resolve, reject) => {
                rejectCollect = reject;
            })),
            cancel,
        });
        const controller = new AbortController();
        const adapter = new BrowserWhisperAdapter({
            engine: new BrowserWhisper(),
            signal: controller.signal,
        });

        const pending = adapter.recognize({ ...recognizeInput(), signal: controller.signal });
        controller.abort();

        await expect(pending).rejects.toMatchObject({ code: "CANCELLED" });
        expect(cancel).toHaveBeenCalledOnce();
    });

    it("surfaces a model download failure as a clear network error", async () => {
        engine.transcribePCM.mockImplementation(() => {
            const cause = new Error("Failed to fetch https://huggingface.co/onnx-community/...");
            cause.name = "ModelLoadError";
            throw cause;
        });
        const adapter = new BrowserWhisperAdapter({ engine: new BrowserWhisper() });

        await expect(adapter.recognize(recognizeInput())).rejects.toMatchObject({
            code: "EXTERNAL_UNAVAILABLE",
            message: expect.stringContaining("Network error"),
        });
    });
});
