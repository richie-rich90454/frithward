import { describe, expect, it, vi } from "vitest";
import { TranscoderFacade, type FfmpegModule, type Transcoder } from "./TranscoderFacade.js";

function fakeFfmpegModule(transcode: () => Promise<ArrayBuffer>) {
    const start = vi.fn(async () => undefined);
    const stop = vi.fn(async () => undefined);
    const configs: unknown[] = [];
    const module = {
        FfmpegWasmTranscoder: class {
            public constructor(config: unknown) {
                configs.push(config);
            }
            public start = start;
            public stop = stop;
            public transcode = transcode;
        },
    };
    return { module: module as unknown as FfmpegModule, start, stop, configs };
}

describe("TranscoderFacade", () => {
    it("uses the primary transcoder when it succeeds", async () => {
        const output = new ArrayBuffer(4);
        const primary: Transcoder = {
            start: vi.fn(),
            transcode: async () => output,
            stop: vi.fn(),
        };
        const loadFfmpeg = vi.fn();
        const facade = new TranscoderFacade(primary, {
            loadFfmpeg: loadFfmpeg as unknown as () => Promise<FfmpegModule>,
        });
        expect(await facade.transcode({ input: new ArrayBuffer(2) })).toBe(output);
        expect(loadFfmpeg).not.toHaveBeenCalled();
    });

    it("falls back to FFmpeg.wasm on unsupported formats", async () => {
        const output = new ArrayBuffer(8);
        const primaryStop = vi.fn();
        const primary: Transcoder = {
            start: vi.fn(),
            transcode: async () => {
                throw new Error("Unsupported format");
            },
            stop: primaryStop,
        };
        const fake = fakeFfmpegModule(async () => output);
        const facade = new TranscoderFacade(primary, {
            loadFfmpeg: async () => fake.module,
            config: { coreURL: "/core.js", wasmURL: "/core.wasm" },
        });
        expect(await facade.transcode({ input: new ArrayBuffer(2) })).toBe(output);
        expect(primaryStop).toHaveBeenCalledTimes(1);
        expect(fake.start).toHaveBeenCalledTimes(1);
        expect(fake.stop).toHaveBeenCalledTimes(1);
        expect(fake.configs[0]).toEqual({ coreURL: "/core.js", wasmURL: "/core.wasm" });
    });

    it("does not fall back on unrelated errors", async () => {
        const primary: Transcoder = {
            start: vi.fn(),
            transcode: async () => {
                throw new Error("disk on fire");
            },
            stop: vi.fn(),
        };
        const loadFfmpeg = vi.fn();
        const facade = new TranscoderFacade(primary, {
            loadFfmpeg: loadFfmpeg as unknown as () => Promise<FfmpegModule>,
        });
        await expect(facade.transcode({ input: new ArrayBuffer(2) })).rejects.toThrow("disk on fire");
        expect(loadFfmpeg).not.toHaveBeenCalled();
    });
});
