import { DetectGpuUseCase } from "../../application/DetectGpuUseCase";
import { StoreAssetUseCase } from "../../application/StoreAssetUseCase";
import { TranscodeUseCase } from "../../application/TranscodeUseCase";
import { OpfsStorageAdapter } from "../../infrastructure/OpfsStorageAdapter";
import { WebCodecsTranscoder } from "../../infrastructure/WebCodecsTranscoder";
import { WebGpuDetector } from "../../infrastructure/WebGpuDetector";
import type { GpuReport } from "../../ports/GpuDetectionPort";
import type { StoredAsset } from "../../ports/AssetStoragePort";
import type {
    MediaKind,
    TranscodeRequest,
    TranscodeConfig,
    TranscodeResult,
} from "../../ports/TranscoderPort";

export interface RuntimeState {
    storageMessage: string | null;
    stored: readonly StoredAsset[];
    lastReadBytes: number | null;
    transcode: TranscodeResult | null;
    gpu: GpuReport | null;
    error: string | null;
}

function message(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

export class RuntimeController {
    private readonly listeners = new Set<() => void>();
    private state: RuntimeState = {
        storageMessage: null,
        stored: [],
        lastReadBytes: null,
        transcode: null,
        gpu: null,
        error: null,
    };

    public constructor(
        private readonly storeAsset: StoreAssetUseCase,
        private readonly transcodeAsset: TranscodeUseCase,
        private readonly detectGpuUseCase: DetectGpuUseCase,
    ) {}

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getState(): RuntimeState {
        return this.state;
    }

    public async store(name: string, data: ArrayBuffer): Promise<void> {
        try {
            this.state = { ...this.state, error: null };
            const asset = await this.storeAsset.store(name, data);
            this.state = {
                ...this.state,
                storageMessage: `Stored "${asset.name}" (${asset.size} bytes).`,
                stored: await this.storeAsset.list(),
            };
        } catch (cause) {
            this.fail(cause);
        }
        this.notify();
    }

    public async read(name: string): Promise<void> {
        try {
            this.state = { ...this.state, error: null };
            const data = await this.storeAsset.read(name);
            this.state = {
                ...this.state,
                lastReadBytes: data === null ? null : data.byteLength,
                storageMessage:
                    data === null ? `No asset named "${name}" was found.` : `Read "${name}".`,
            };
        } catch (cause) {
            this.fail(cause);
        }
        this.notify();
    }

    public async refresh(): Promise<void> {
        try {
            this.state = { ...this.state, error: null, stored: await this.storeAsset.list() };
        } catch (cause) {
            this.fail(cause);
        }
        this.notify();
    }

    public async transcode(request: TranscodeRequest): Promise<void> {
        try {
            this.state = { ...this.state, error: null };
            this.state = { ...this.state, transcode: await this.transcodeAsset.execute(request) };
        } catch (cause) {
            this.fail(cause);
        }
        this.notify();
    }

    public async detectGpu(signal: AbortSignal = new AbortController().signal): Promise<void> {
        try {
            this.state = { ...this.state, error: null };
            this.state = { ...this.state, gpu: await this.detectGpuUseCase.execute(signal) };
        } catch (cause) {
            this.fail(cause);
        }
        this.notify();
    }

    private fail(cause: unknown): void {
        this.state = { ...this.state, error: message(cause) };
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}

export async function readFileBytes(file: File): Promise<ArrayBuffer> {
    return file.arrayBuffer();
}

export function buildTranscodeRequest(input: {
    kind: MediaKind;
    codec: string;
    width: number;
    height: number;
    sampleRate: number;
    channels: number;
    data: ArrayBuffer;
    signal?: AbortSignal;
}): TranscodeRequest {
    const config: TranscodeConfig =
        input.kind === "video"
            ? {
                  kind: "video",
                  codec: input.codec,
                  width: input.width,
                  height: input.height,
                  bitrate: 2_000_000,
                  framerate: 30,
              }
            : {
                  kind: "audio",
                  codec: input.codec,
                  sampleRate: input.sampleRate,
                  numberOfChannels: input.channels,
                  bitrate: 128_000,
              };
    return {
        config,
        chunks: [{ data: input.data, timestampUs: 0, durationUs: 0, keyFrame: true }],
        signal: input.signal ?? new AbortController().signal,
    };
}

export function createRuntimeController(): RuntimeController {
    const storage = new OpfsStorageAdapter();
    return new RuntimeController(
        new StoreAssetUseCase(storage),
        new TranscodeUseCase(new WebCodecsTranscoder()),
        new DetectGpuUseCase(new WebGpuDetector()),
    );
}
