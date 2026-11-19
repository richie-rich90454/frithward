import { AppError } from "@frithward/contracts";

export interface TranscoderAdapter {
    transcode(input: ArrayBuffer, format: string): Promise<ArrayBuffer>;
}

const SUPPORTED_OUTPUT_FORMATS = new Set(["mp4"]);

class MediabunnyAdapter implements TranscoderAdapter {
    public async transcode(input: ArrayBuffer, format: string): Promise<ArrayBuffer> {
        if (!SUPPORTED_OUTPUT_FORMATS.has(format.toLowerCase())) {
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                `Transcoding to "${format}" is unavailable; the only supported output format is mp4.`,
            );
        }
        const { MediabunnyTranscoder } = await import("@frithward/inference");
        return new MediabunnyTranscoder().transcode({ input });
    }
}

export class MediaTranscoder {
    private readonly adapter: TranscoderAdapter | null;

    public constructor(adapter?: TranscoderAdapter | null) {
        this.adapter = adapter === undefined ? new MediabunnyAdapter() : adapter;
    }

    public async convert(input: ArrayBuffer, format: string): Promise<ArrayBuffer> {
        if (format.trim().length === 0) throw new Error("Format required.");
        if (!this.adapter) {
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "No transcoder adapter is available; provide one to MediaTranscoder.",
            );
        }
        return this.adapter.transcode(input, format);
    }
}
