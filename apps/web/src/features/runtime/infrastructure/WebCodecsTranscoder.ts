import type { TranscodeRequest, TranscodeResult, TranscoderPort } from "../ports/TranscoderPort";

function checkAbort(signal: AbortSignal): void {
    if (signal.aborted) throw new Error("Transcoding was aborted.");
}

function failure(cause: unknown): Error {
    return cause instanceof Error ? cause : new Error(String(cause));
}

export class WebCodecsTranscoder implements TranscoderPort {
    public async transcode(request: TranscodeRequest): Promise<TranscodeResult> {
        if (request.config.kind === "video") return this.transcodeVideo(request);
        return this.transcodeAudio(request);
    }

    private async transcodeVideo(request: TranscodeRequest): Promise<TranscodeResult> {
        const config = request.config;
        if (config.kind !== "video") throw new Error("Expected a video configuration.");
        if (
            typeof VideoEncoder === "undefined" ||
            typeof VideoDecoder === "undefined" ||
            typeof VideoFrame === "undefined"
        ) {
            throw new Error("WebCodecs video encoding or decoding is not available in this browser.");
        }

        const encoded: EncodedVideoChunk[] = [];
        const state: { description: AllowSharedBufferSource | undefined; error: Error | null } = {
            description: undefined,
            error: null,
        };
        const encoder = new VideoEncoder({
            output: (chunk, metadata) => {
                encoded.push(chunk);
                if (!state.description) state.description = metadata?.decoderConfig?.description;
            },
            error: (cause) => {
                state.error = failure(cause);
            },
        });

        try {
            encoder.configure({
                codec: config.codec,
                width: config.width,
                height: config.height,
                bitrate: config.bitrate,
                framerate: config.framerate,
            });
            for (const chunk of request.chunks) {
                checkAbort(request.signal);
                const frame = new VideoFrame(chunk.data, {
                    format: "RGBA",
                    codedWidth: config.width,
                    codedHeight: config.height,
                    timestamp: chunk.timestampUs,
                    duration: chunk.durationUs,
                });
                try {
                    if (chunk.keyFrame === true) encoder.encode(frame, { keyFrame: true });
                    else encoder.encode(frame);
                } finally {
                    frame.close();
                }
            }
            await encoder.flush();
            if (state.error) throw state.error;
        } finally {
            encoder.close();
        }

        const decodeState = { count: 0, error: null as Error | null };
        const decoder = new VideoDecoder({
            output: () => {
                decodeState.count += 1;
            },
            error: (cause) => {
                decodeState.error = failure(cause);
            },
        });
        try {
            decoder.configure({
                codec: config.codec,
                ...(state.description ? { description: state.description } : {}),
            });
            for (const chunk of encoded) {
                checkAbort(request.signal);
                decoder.decode(chunk);
            }
            await decoder.flush();
            if (decodeState.error) throw decodeState.error;
        } finally {
            decoder.close();
        }

        return {
            kind: "video",
            codec: config.codec,
            encodedChunks: encoded.length,
            decodedChunks: decodeState.count,
            encodedBytes: encoded.reduce((total, chunk) => total + chunk.byteLength, 0),
        };
    }

    private async transcodeAudio(request: TranscodeRequest): Promise<TranscodeResult> {
        const config = request.config;
        if (config.kind !== "audio") throw new Error("Expected an audio configuration.");
        if (
            typeof AudioEncoder === "undefined" ||
            typeof AudioDecoder === "undefined" ||
            typeof AudioData === "undefined"
        ) {
            throw new Error("WebCodecs audio encoding or decoding is not available in this browser.");
        }

        const encoded: EncodedAudioChunk[] = [];
        const state: { description: AllowSharedBufferSource | undefined; error: Error | null } = {
            description: undefined,
            error: null,
        };
        const encoder = new AudioEncoder({
            output: (chunk, metadata) => {
                encoded.push(chunk);
                if (!state.description) state.description = metadata?.decoderConfig?.description;
            },
            error: (cause) => {
                state.error = failure(cause);
            },
        });

        try {
            encoder.configure({
                codec: config.codec,
                sampleRate: config.sampleRate,
                numberOfChannels: config.numberOfChannels,
                bitrate: config.bitrate,
            });
            for (const chunk of request.chunks) {
                checkAbort(request.signal);
                const bytesPerFrame = 4 * config.numberOfChannels;
                const audioData = new AudioData({
                    format: "f32-planar",
                    sampleRate: config.sampleRate,
                    numberOfFrames: Math.floor(chunk.data.byteLength / bytesPerFrame),
                    numberOfChannels: config.numberOfChannels,
                    timestamp: chunk.timestampUs,
                    data: new Float32Array(chunk.data),
                });
                try {
                    encoder.encode(audioData);
                } finally {
                    audioData.close();
                }
            }
            await encoder.flush();
            if (state.error) throw state.error;
        } finally {
            encoder.close();
        }

        const decodeState = { count: 0, error: null as Error | null };
        const decoder = new AudioDecoder({
            output: () => {
                decodeState.count += 1;
            },
            error: (cause) => {
                decodeState.error = failure(cause);
            },
        });
        try {
            decoder.configure({
                codec: config.codec,
                sampleRate: config.sampleRate,
                numberOfChannels: config.numberOfChannels,
                ...(state.description ? { description: state.description } : {}),
            });
            for (const chunk of encoded) {
                checkAbort(request.signal);
                decoder.decode(chunk);
            }
            await decoder.flush();
            if (decodeState.error) throw decodeState.error;
        } finally {
            decoder.close();
        }

        return {
            kind: "audio",
            codec: config.codec,
            encodedChunks: encoded.length,
            decodedChunks: decodeState.count,
            encodedBytes: encoded.reduce((total, chunk) => total + chunk.byteLength, 0),
        };
    }
}
