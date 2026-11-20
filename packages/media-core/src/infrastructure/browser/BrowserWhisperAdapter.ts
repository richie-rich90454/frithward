import { AppError } from "@frithward/contracts";
import type {
    RecognizedUtterance,
    SpeechRecognitionPort,
} from "../../ports/SpeechRecognitionPort.js";

/**
 * Headless adapter around `browser-whisper` v2's `BrowserWhisper` engine.
 *
 * Why the engine is injected: `browser-whisper` is installed in `apps/web`, where
 * Vite bundles its Web Workers. It cannot be imported from this package (no
 * dependency here, and Rolldown cannot resolve it from this directory), so the
 * web layer constructs a real `BrowserWhisper` and passes it as `engine`. This
 * file defines only the structural slice of that API we consume.
 *
 * WebGPU requirement: browser-whisper runs ONNX inference on WebGPU (Chrome/Edge
 * 113+, Safari 18+). It can fall back to threaded WASM, but that needs
 * cross-origin isolation (COOP/COEP), which fails on arbitrary static hosts.
 * This adapter therefore requires WebGPU and raises EXTERNAL_UNAVAILABLE when it
 * is missing, so the zero-config path never depends on special response headers.
 *
 * Honesty about weights: browser-whisper has NO public local-model-file option.
 * It downloads ONNX weights from Hugging Face (`onnx-community`) on first use and
 * caches them in OPFS, so the first run needs network; later runs can be offline.
 * A network failure is surfaced as an EXTERNAL_UNAVAILABLE "Network error" rather
 * than being faked. No audio is ever uploaded.
 */

/** Start/end are seconds relative to the start of the audio. */
export interface BrowserWhisperSegment {
    readonly text: string;
    readonly start: number;
    readonly end: number;
}

export interface BrowserWhisperProgress {
    readonly stage: string;
    readonly progress: number;
}

export interface BrowserWhisperStream {
    collect(): Promise<readonly BrowserWhisperSegment[]>;
    cancel(): void;
}

export interface BrowserWhisperTranscribeOptions {
    language?: string;
    onProgress?: (event: BrowserWhisperProgress) => void;
}

/** The subset of `BrowserWhisper` (browser-whisper v2) used by this adapter. */
export interface BrowserWhisperEngine {
    /** Decodes a real audio/video File via WebCodecs/mediabunny. */
    transcribe(file: File, options?: BrowserWhisperTranscribeOptions): BrowserWhisperStream;
    /** Consumes already-decoded 16-kHz mono Float32 samples. */
    transcribePCM(
        samples: Float32Array,
        options?: BrowserWhisperTranscribeOptions,
    ): BrowserWhisperStream;
    dispose(): void;
}

export interface BrowserWhisperAdapterOptions {
    /** A real `browser-whisper` BrowserWhisper instance. */
    readonly engine: BrowserWhisperEngine;
    readonly language?: string;
    readonly onStatus?: (stage: string) => void;
    readonly signal?: AbortSignal;
    /** MIME type of the uploaded file; enables WebCodecs decoding of normal audio uploads. */
    readonly fileType?: string;
}

const CANCELLED_MESSAGE = "Caption generation cancelled.";
const WEBGPU_MESSAGE =
    "WebGPU is required for local transcription (Chrome/Edge 113+, Safari 18+). " +
    "No audio is uploaded, but the speech model cannot run on this host without WebGPU.";

function errorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

export class BrowserWhisperAdapter implements SpeechRecognitionPort {
    private disposed = false;

    public constructor(private readonly options: BrowserWhisperAdapterOptions) {}

    /** Raises EXTERNAL_UNAVAILABLE when WebGPU is missing (the zero-config path needs it). */
    public assertWebGpuAvailable(): void {
        const nav = globalThis.navigator as { gpu?: unknown } | undefined;
        if (!nav?.gpu) throw new AppError("EXTERNAL_UNAVAILABLE", WEBGPU_MESSAGE);
    }

    public async recognize(input: {
        audio: ArrayBuffer;
        language: string;
        signal: AbortSignal;
    }): Promise<readonly RecognizedUtterance[]> {
        this.assertWebGpuAvailable();
        if (input.signal.aborted || this.options.signal?.aborted)
            throw new AppError("CANCELLED", CANCELLED_MESSAGE);

        const language = input.language || this.options.language;
        const options: BrowserWhisperTranscribeOptions = {
            ...(language ? { language } : {}),
            onProgress: (event) => this.options.onStatus?.(event.stage),
        };

        let stream: BrowserWhisperStream;
        try {
            stream = this.options.fileType
                ? this.options.engine.transcribe(
                      new File([input.audio], "audio-input", { type: this.options.fileType }),
                      options,
                  )
                : this.options.engine.transcribePCM(decodePcm(input.audio), options);
        } catch (cause) {
            throw this.toAppError(cause);
        }

        const cancel = (): void => stream.cancel();
        input.signal.addEventListener("abort", cancel, { once: true });
        this.options.signal?.addEventListener("abort", cancel, { once: true });
        try {
            const segments = await stream.collect();
            if (input.signal.aborted || this.options.signal?.aborted)
                throw new AppError("CANCELLED", CANCELLED_MESSAGE);
            return segments.map((segment) => ({
                startMs: Math.round(segment.start * 1000),
                endMs: Math.round(segment.end * 1000),
                text: segment.text,
                speakerId: null,
            }));
        } catch (cause) {
            if (cause instanceof AppError && cause.code === "CANCELLED") throw cause;
            if (input.signal.aborted || this.options.signal?.aborted)
                throw new AppError("CANCELLED", CANCELLED_MESSAGE);
            throw this.toAppError(cause);
        } finally {
            input.signal.removeEventListener("abort", cancel);
            this.options.signal?.removeEventListener("abort", cancel);
        }
    }

    /** Terminates the underlying browser-whisper worker. Safe to call more than once. */
    public async stop(): Promise<void> {
        if (this.disposed) return;
        this.disposed = true;
        this.options.engine.dispose();
    }

    private toAppError(cause: unknown): AppError {
        if (cause instanceof AppError) return cause;
        const message = errorMessage(cause);
        const name = cause instanceof Error ? cause.name : "";
        const isNetwork =
            name === "ModelLoadError" ||
            /network|fetch|hugging ?face|download|onnx|model load|failed to load|load model|ENOTFOUND|ECONN|EAI_AGAIN|timeout/i.test(
                message,
            );
        if (isNetwork) {
            return new AppError(
                "EXTERNAL_UNAVAILABLE",
                `Network error while fetching the speech model from Hugging Face ` +
                    `(first run needs network; weights are then cached in the browser): ${message}`,
                cause,
            );
        }
        return new AppError("PROCESSING_FAILED", `Transcription failed: ${message}`, cause);
    }
}

// browser-whisper and whisper.cpp both accept 16-bit signed little-endian mono PCM at 16 kHz.
// Complexity: O(samples).
function decodePcm(audio: ArrayBuffer): Float32Array {
    const samples = new Float32Array(Math.floor(audio.byteLength / 2));
    const view = new DataView(audio);
    for (let index = 0; index < samples.length; index += 1) {
        samples[index] = view.getInt16(index * 2, true) / 32768;
    }
    return samples;
}
