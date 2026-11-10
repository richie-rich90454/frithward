import { ComlinkWorkerClient } from "@frithward/inference";
import type { RecognizedUtterance, SpeechRecognitionPort } from "../../ports/SpeechRecognitionPort.js";
import type { WhisperWorkerApi } from "./whisper.worker.js";

export interface WhisperWasmAdapterOptions {
    readonly modelUrl: string;
    readonly wasmUrl: string;
    readonly createWorker?: () => Worker;
}

export class WhisperWasmAdapter implements SpeechRecognitionPort {
    private readonly client: ComlinkWorkerClient<WhisperWorkerApi>;

    public constructor(private readonly options: WhisperWasmAdapterOptions) {
        this.client = new ComlinkWorkerClient<WhisperWorkerApi>(
            options.createWorker ??
                (() => new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" })),
        );
    }

    public async start(): Promise<void> {
        this.client.start();
        await this.client.run(async (api) => {
            await api.initialize({ modelUrl: this.options.modelUrl, wasmUrl: this.options.wasmUrl });
        });
    }

    public async stop(): Promise<void> {
        if (!this.client.isRunning()) return;
        try {
            await this.client.run(async (api) => api.dispose());
        } finally {
            this.client.stop();
        }
    }

    public async recognize(input: {
        audio: ArrayBuffer;
        language: string;
        signal: AbortSignal;
    }): Promise<readonly RecognizedUtterance[]> {
        if (!this.client.isRunning()) throw new Error("Whisper WASM adapter is not started.");
        const pcm = this.decodePcm(input.audio);
        return this.client.run(
            async (api) => api.transcribe({ audio: pcm, language: input.language }),
            input.signal,
        );
    }

    // Expects 16-bit signed little-endian PCM mono at 16 kHz, whisper.cpp's native input format.
    private decodePcm(audio: ArrayBuffer): Float32Array {
        const samples = new Float32Array(Math.floor(audio.byteLength / 2));
        const view = new DataView(audio);
        for (let index = 0; index < samples.length; index += 1) {
            samples[index] = view.getInt16(index * 2, true) / 32768;
        }
        return samples;
    }
}
