import { AppError } from "@frithward/contracts";

export interface PcmCaptureCallbacks {
    onChunk(samples: Int16Array): void;
}

export interface MicrophonePcmCaptureOptions {
    workletUrl?: URL | string;
    createContext?: () => AudioContext;
}

interface PcmPortMessage {
    type: string;
    samples: Int16Array;
}

/** Headless microphone -> 16kHz mono Int16 PCM capture via an AudioWorklet. */
export class MicrophonePcmCapture {
    private context: AudioContext | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private node: AudioWorkletNode | null = null;
    private sink: GainNode | null = null;
    private aborted = false;

    public constructor(
        private readonly callbacks: PcmCaptureCallbacks,
        private readonly options: MicrophonePcmCaptureOptions = {},
    ) {}

    public isSupported(): boolean {
        const scope = globalThis as unknown as { AudioContext?: unknown };
        return typeof scope.AudioContext === "function" && typeof AudioWorkletNode !== "undefined";
    }

    public async start(stream: MediaStream): Promise<void> {
        if (!this.isSupported())
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "AudioWorklet microphone capture is not supported in this browser.",
            );
        const createContext = this.options.createContext ?? (() => new AudioContext());
        const context = createContext();
        const workletUrl =
            this.options.workletUrl ?? new URL("./pcm-capture.worklet.ts", import.meta.url);
        try {
            await context.audioWorklet.addModule(
                typeof workletUrl === "string" ? workletUrl : workletUrl.href,
            );
            const source = context.createMediaStreamSource(stream);
            const node = new AudioWorkletNode(context, "frithward-pcm-capture", {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1],
            });
            this.aborted = false;
            node.port.onmessage = (event: MessageEvent<PcmPortMessage>) => {
                if (this.aborted || event.data?.type !== "pcm") return;
                this.callbacks.onChunk(event.data.samples);
            };
            // A silent sink keeps the graph running without playing captured audio.
            const sink = context.createGain();
            sink.gain.value = 0;
            source.connect(node);
            node.connect(sink);
            sink.connect(context.destination);
            this.context = context;
            this.source = source;
            this.node = node;
            this.sink = sink;
        } catch (cause) {
            void context.close();
            throw new AppError("EXTERNAL_UNAVAILABLE", "Could not start PCM capture.", cause);
        }
    }

    public stop(): void {
        this.teardown(false);
    }

    public abort(): void {
        this.teardown(true);
    }

    private teardown(abort: boolean): void {
        this.aborted = abort;
        if (this.node) this.node.port.onmessage = null;
        this.node?.disconnect();
        this.source?.disconnect();
        this.sink?.disconnect();
        const context = this.context;
        this.node = null;
        this.source = null;
        this.sink = null;
        this.context = null;
        if (context) void context.close();
    }
}
