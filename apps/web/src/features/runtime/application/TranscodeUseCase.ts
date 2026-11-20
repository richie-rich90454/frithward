import { CodedError, ERROR_CODES } from "@frithward/contracts";
import type { TranscodeRequest, TranscodeResult, TranscoderPort } from "../ports/TranscoderPort";

export class TranscodeUseCase {
    public constructor(private readonly transcoder: TranscoderPort) {}

    public async execute(request: TranscodeRequest): Promise<TranscodeResult> {
        if (request.signal.aborted)
            throw new CodedError(ERROR_CODES.TRANSCODE_ABORTED, "Transcoding was aborted.");
        if (request.chunks.length === 0)
            throw new CodedError(ERROR_CODES.TRANSCODE_NO_CHUNKS, "No media chunks to transcode.");
        if (request.config.bitrate <= 0)
            throw new CodedError(
                ERROR_CODES.TRANSCODE_BITRATE_INVALID,
                "Bitrate must be positive.",
            );
        return this.transcoder.transcode(request);
    }
}
