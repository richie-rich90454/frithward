import { CaptionProject, EditSubtitleUseCase, SubtitleSegment } from "@frithward/media-core";
import { ImageRedactor } from "../../application/ImageRedactor.js";
import { encodeWav } from "../../application/WavEncoder.js";
import { WebCodecsTranscoder } from "../../../runtime/infrastructure/WebCodecsTranscoder.js";
import type { TranscoderPort } from "../../../runtime/ports/TranscoderPort.js";
import { LocalStorageCaptionRepository } from "../../../captions/infrastructure/LocalStorageCaptionRepository.js";

export interface MediaArtifact {
    blob: Blob;
    fileName: string;
}

export interface MediaWorkshopSegment {
    id: string;
    startMs: number;
    endMs: number;
    text: string;
}

export interface DecodedAudio {
    sampleRate: number;
    numberOfChannels: number;
    duration: number;
    channels: readonly Float32Array[];
}

export type AudioDecodeFn = (bytes: ArrayBuffer) => Promise<DecodedAudio>;

const defaultDecodeAudio: AudioDecodeFn = async (bytes) => {
    if (typeof AudioContext === "undefined")
        throw new Error("Audio decoding (AudioContext) is not available in this browser.");
    const context = new AudioContext();
    try {
        const buffer = await context.decodeAudioData(bytes);
        const channels: Float32Array[] = [];
        for (let index = 0; index < buffer.numberOfChannels; index += 1) {
            channels.push(buffer.getChannelData(index));
        }
        return {
            sampleRate: buffer.sampleRate,
            numberOfChannels: buffer.numberOfChannels,
            duration: buffer.duration,
            channels,
        };
    } finally {
        await context.close();
    }
};

const WAVEFORM_BUCKETS = 256;

/**
 * Downsampled amplitude envelope: the max absolute sample per bucket, mixing
 * channels by taking their peak. O(n) time for n total samples (one pass,
 * constant work per sample) and O(WAVEFORM_BUCKETS) space.
 */
function amplitudeEnvelope(channels: readonly Float32Array[]): number[] {
    const frames = channels[0]?.length ?? 0;
    const envelope = new Array<number>(WAVEFORM_BUCKETS).fill(0);
    if (frames === 0) return envelope;
    for (let frame = 0; frame < frames; frame += 1) {
        const bucket = Math.min(WAVEFORM_BUCKETS - 1, Math.floor((frame / frames) * WAVEFORM_BUCKETS));
        let peak = 0;
        for (const channel of channels) {
            const value = Math.abs(channel[frame] ?? 0);
            if (value > peak) peak = value;
        }
        if (peak > (envelope[bucket] ?? 0)) envelope[bucket] = peak;
    }
    return envelope;
}

export interface MediaWorkshopControllerOptions {
    transcoder?: TranscoderPort;
    redactor?: ImageRedactor;
    decodeAudio?: AudioDecodeFn;
}

export class MediaWorkshopController {
    private readonly project: CaptionProject;
    private readonly editor: EditSubtitleUseCase;
    private readonly transcoder: TranscoderPort;
    private readonly redactor: ImageRedactor;
    private readonly decodeAudio: AudioDecodeFn;
    private readonly listeners = new Set<() => void>();
    private selectedSegmentId: string | null = null;
    private error: string | null = null;
    private transcodeStatus: string | null = null;
    private redactionStatus: string | null = null;
    private previewUrl: string | null = null;
    private decodedAudio: DecodedAudio | null = null;
    private waveformData: readonly number[] | null = null;
    private transcodedAudio: MediaArtifact | null = null;
    private redactedImage: MediaArtifact | null = null;

    public constructor(options: MediaWorkshopControllerOptions = {}) {
        this.project = new CaptionProject({
            id: "media-workshop",
            title: "Media workshop",
            language: "en",
        });
        this.editor = new EditSubtitleUseCase(new LocalStorageCaptionRepository());
        this.transcoder = options.transcoder ?? new WebCodecsTranscoder();
        this.redactor = options.redactor ?? new ImageRedactor();
        this.decodeAudio = options.decodeAudio ?? defaultDecodeAudio;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getSegments(): readonly MediaWorkshopSegment[] {
        return this.project.listSegments().map((segment) => ({
            id: segment.id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            text: segment.text,
        }));
    }

    public getSelectedSegmentId(): string | null {
        return this.selectedSegmentId;
    }

    public getError(): string | null {
        return this.error;
    }

    public getTranscodeStatus(): string | null {
        return this.transcodeStatus;
    }

    public getRedactionStatus(): string | null {
        return this.redactionStatus;
    }

    public getPreviewUrl(): string | null {
        return this.previewUrl;
    }

    public getTranscodedAudio(): MediaArtifact | null {
        return this.transcodedAudio;
    }

    public getRedactedImage(): MediaArtifact | null {
        return this.redactedImage;
    }

    public getWaveformData(): readonly number[] | null {
        if (!this.decodedAudio) return null;
        if (!this.waveformData) this.waveformData = amplitudeEnvelope(this.decodedAudio.channels);
        return this.waveformData;
    }

    public addSegment(input: { startMs: string; endMs: string; text: string }): void {
        const start = Number(input.startMs);
        const end = Number(input.endMs);
        if (!Number.isInteger(start) || !Number.isInteger(end)) {
            this.error = "Start and end must be whole milliseconds.";
            this.notify();
            return;
        }
        if (input.text.trim().length === 0) {
            this.error = "Segment text required.";
            this.notify();
            return;
        }
        try {
            this.project.addSegment(
                new SubtitleSegment({
                    id: `${this.project.id}-seg-${this.project.segmentCount}`,
                    startMs: start,
                    endMs: end,
                    text: input.text.trim(),
                }),
            );
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Could not add segment.";
        }
        this.notify();
    }

    public select(segmentId: string): void {
        try {
            this.project.getSegment(segmentId);
            this.selectedSegmentId = segmentId;
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Segment not found.";
        }
        this.notify();
    }

    public async applyEdit(input: { segmentId: string; text: string }): Promise<void> {
        try {
            await this.editor.execute({
                project: this.project,
                segmentId: input.segmentId,
                text: input.text,
            });
            this.selectedSegmentId = input.segmentId;
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Edit failed.";
        }
        this.notify();
    }

    public async transcodeAudio(file: File): Promise<void> {
        this.transcodeStatus = "Decoding audio...";
        this.transcodedAudio = null;
        this.decodedAudio = null;
        this.waveformData = null;
        this.notify();
        try {
            const decoded = await this.decodeAudio(await file.arrayBuffer());
            this.decodedAudio = decoded;
            const length = decoded.channels[0]?.length ?? 0;
            const samples = new Float32Array(length * decoded.numberOfChannels);
            decoded.channels.forEach((channel, index) => {
                samples.set(channel, index * length);
            });
            this.transcodeStatus = "Transcoding audio...";
            this.notify();
            const result = await this.transcoder.transcode({
                config: {
                    kind: "audio",
                    codec: "mp4a.40.2",
                    sampleRate: decoded.sampleRate,
                    numberOfChannels: decoded.numberOfChannels,
                    bitrate: 128000,
                },
                chunks: [
                    {
                        data: samples.buffer as ArrayBuffer,
                        timestampUs: 0,
                        durationUs: Math.round(decoded.duration * 1_000_000),
                    },
                ],
                signal: new AbortController().signal,
            });
            this.transcodedAudio = {
                blob: encodeWav(decoded.channels, decoded.sampleRate),
                fileName: "transcoded-audio.wav",
            };
            this.transcodeStatus = `Transcoded ${result.encodedChunks} chunk(s), ${result.encodedBytes} bytes (${result.decodedChunks} decoded).`;
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Audio transcoding failed.";
            this.transcodeStatus = null;
        }
        this.notify();
    }

    public async redactImage(input: {
        file: File;
        x: string;
        y: string;
        width: string;
        height: string;
    }): Promise<void> {
        this.redactionStatus = "Redacting image...";
        this.redactedImage = null;
        this.notify();
        try {
            const blob = await this.redactor.redact(await input.file.arrayBuffer(), {
                x: Number(input.x),
                y: Number(input.y),
                width: Number(input.width),
                height: Number(input.height),
            });
            if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = URL.createObjectURL(blob);
            this.redactedImage = { blob, fileName: "redacted-image.png" };
            this.redactionStatus = "Redacted image ready.";
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Image redaction failed.";
            this.redactionStatus = null;
        }
        this.notify();
    }

    public dispose(): void {
        if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = null;
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
