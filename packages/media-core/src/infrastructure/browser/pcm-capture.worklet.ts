import { PCM_CHUNK_MS, downsampleToPcm16, interleaveChannels } from "./pcm-downsample.js";

export interface PcmChunkMessage {
    type: "pcm";
    samples: Int16Array;
}

const scope = globalThis as unknown as {
    AudioWorkletProcessor: new () => {
        port: { postMessage(message: unknown, transfer?: Transferable[]): void };
    };
    registerProcessor?: (name: string, constructor: unknown) => void;
    sampleRate?: number;
};

class PcmCaptureProcessor extends scope.AudioWorkletProcessor {
    private readonly inputRate: number;
    private readonly chunkFrames: number;
    private channels = 1;
    private buffer = new Float32Array(0);

    public constructor() {
        super();
        this.inputRate = scope.sampleRate ?? 48_000;
        this.chunkFrames = Math.max(1, Math.round((this.inputRate * PCM_CHUNK_MS) / 1000));
    }

    public process(inputs: Float32Array[][]): boolean {
        const input = inputs[0];
        if (input && input.length > 0) this.append(interleaveChannels(input), input.length);

        while (Math.floor(this.buffer.length / this.channels) >= this.chunkFrames) {
            const take = this.chunkFrames * this.channels;
            const slice = this.buffer.subarray(0, take);
            this.buffer = this.buffer.slice(take);
            const samples = downsampleToPcm16(slice, this.inputRate, this.channels);
            const message: PcmChunkMessage = { type: "pcm", samples };
            this.port.postMessage(message, [samples.buffer]);
        }
        return true;
    }

    private append(data: Float32Array, channels: number): void {
        this.channels = channels;
        const merged = new Float32Array(this.buffer.length + data.length);
        merged.set(this.buffer);
        merged.set(data, this.buffer.length);
        this.buffer = merged;
    }
}

if (typeof scope.registerProcessor === "function")
    scope.registerProcessor("frithward-pcm-capture", PcmCaptureProcessor);
