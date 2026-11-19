export type MediaKind = "video" | "audio";

export interface VideoTranscodeConfig {
    kind: "video";
    codec: string;
    width: number;
    height: number;
    bitrate: number;
    framerate: number;
}

export interface AudioTranscodeConfig {
    kind: "audio";
    codec: string;
    sampleRate: number;
    numberOfChannels: number;
    bitrate: number;
}

export type TranscodeConfig = VideoTranscodeConfig | AudioTranscodeConfig;

export interface TranscodeChunk {
    data: ArrayBuffer;
    timestampUs: number;
    durationUs: number;
    keyFrame?: boolean;
}

export interface TranscodeRequest {
    config: TranscodeConfig;
    chunks: readonly TranscodeChunk[];
    signal: AbortSignal;
}

export interface TranscodeResult {
    kind: MediaKind;
    codec: string;
    encodedChunks: number;
    decodedChunks: number;
    encodedBytes: number;
}

export interface TranscoderPort {
    transcode(request: TranscodeRequest): Promise<TranscodeResult>;
}
