import type {
    TranscodeRequest,
    TranscodeResult,
    TranscoderPort,
} from "../ports/TranscoderPort";

export class TranscodeUseCase {
    public constructor(private readonly transcoder: TranscoderPort) {}

    public async execute(request: TranscodeRequest): Promise<TranscodeResult> {
        if (request.signal.aborted) throw new Error("Transcoding was aborted.");
        if (request.chunks.length === 0) throw new Error("No media chunks to transcode.");
        if (request.config.bitrate <= 0) throw new Error("Bitrate must be positive.");
        return this.transcoder.transcode(request);
    }
}
