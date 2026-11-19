import { MediabunnyTranscoder } from "./MediabunnyTranscoder.js";

export interface FacadeTranscodeRequest {
    readonly input: ArrayBuffer;
    readonly signal?: AbortSignal;
}

export interface Transcoder {
    start(): void | Promise<void>;
    transcode(request: FacadeTranscodeRequest): Promise<ArrayBuffer>;
    stop(): void | Promise<void>;
}

export interface FfmpegFallbackConfig {
    readonly coreURL?: string;
    readonly wasmURL?: string;
}

export type FfmpegModule = typeof import("./FfmpegWasmTranscoder.js");

export interface TranscoderFacadeOptions {
    /** Injectable so tests can avoid loading the wasm runtime. */
    readonly loadFfmpeg?: () => Promise<FfmpegModule>;
    readonly config?: FfmpegFallbackConfig;
}

function shouldFallback(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    const code = (error as { code?: unknown } | null)?.code;
    if (code === "EXTERNAL_UNAVAILABLE") return true;
    const message = error instanceof Error ? error.message : String(error);
    return /unsupported|not supported|codec|format|mediabunny/i.test(message);
}

/** Mediabunny first, FFmpeg.wasm for formats the primary transcoder cannot handle. */
export class TranscoderFacade {
    public constructor(
        private readonly primary: Transcoder = new MediabunnyTranscoder(),
        private readonly options: TranscoderFacadeOptions = {},
    ) {}

    public async transcode(request: FacadeTranscodeRequest): Promise<ArrayBuffer> {
        await this.primary.start();
        try {
            return await this.primary.transcode(request);
        } catch (error) {
            if (!shouldFallback(error)) throw error;
            await this.primary.stop();
            return this.transcodeWithFfmpeg(request);
        }
    }

    private async transcodeWithFfmpeg(request: FacadeTranscodeRequest): Promise<ArrayBuffer> {
        const load = this.options.loadFfmpeg ?? (() => import("./FfmpegWasmTranscoder.js"));
        const module = await load();
        const config = this.options.config ?? {};
        const ffmpeg = new module.FfmpegWasmTranscoder({
            ...(config.coreURL ? { coreURL: config.coreURL } : {}),
            ...(config.wasmURL ? { wasmURL: config.wasmURL } : {}),
        });
        await ffmpeg.start();
        try {
            return await ffmpeg.transcode({
                input: request.input,
                inputName: "input.bin",
                outputName: "output.mp4",
                args: ["-i", "input.bin", "-c:v", "copy", "-c:a", "copy", "output.mp4"],
                ...(request.signal ? { signal: request.signal } : {}),
            });
        } finally {
            await ffmpeg.stop();
        }
    }
}
