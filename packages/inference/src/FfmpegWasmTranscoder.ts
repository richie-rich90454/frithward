import { FFmpeg, type FFMessageLoadConfig } from "@ffmpeg/ffmpeg";

export interface FfmpegTranscodeRequest {
    readonly input: ArrayBuffer;
    readonly inputName: string;
    readonly outputName: string;
    readonly args: readonly string[];
    readonly signal?: AbortSignal;
}

export class FfmpegWasmTranscoder {
    private ffmpeg: FFmpeg | null = null;

    public constructor(private readonly loadConfig?: FFMessageLoadConfig) {}

    public async start(): Promise<void> {
        if (this.ffmpeg) return;
        const ffmpeg = new FFmpeg();
        await ffmpeg.load(this.loadConfig);
        this.ffmpeg = ffmpeg;
    }

    public stop(): void {
        this.ffmpeg?.terminate();
        this.ffmpeg = null;
    }

    public async transcode(request: FfmpegTranscodeRequest): Promise<ArrayBuffer> {
        // Complexity: O(media size); ffmpeg.wasm streams through its virtual file system.
        if (!this.ffmpeg) throw new Error("FFmpeg WASM transcoder is not started.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const options = request.signal ? { signal: request.signal } : {};
        await this.ffmpeg.writeFile(request.inputName, new Uint8Array(request.input), options);
        const exitCode = await this.ffmpeg.exec([...request.args], undefined, options);
        if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}.`);
        const data = await this.ffmpeg.readFile(request.outputName, undefined, options);
        if (typeof data === "string") return new TextEncoder().encode(data).buffer;
        return new Uint8Array(data).buffer;
    }
}
