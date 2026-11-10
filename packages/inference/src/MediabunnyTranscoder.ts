import {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
} from "mediabunny";

export interface MediabunnyTranscodeRequest {
    readonly input: ArrayBuffer;
    readonly signal?: AbortSignal;
}

export class MediabunnyTranscoder {
    private conversion: Conversion | null = null;

    public start(): void {
        // Conversions are created per call; there is no long-lived resource to start.
    }

    public async stop(): Promise<void> {
        const conversion = this.conversion;
        this.conversion = null;
        if (conversion) await conversion.cancel();
    }

    public async transcode(request: MediabunnyTranscodeRequest): Promise<ArrayBuffer> {
        // Complexity: O(media size); conversion streams through mediabunny's pipeline.
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const target = new BufferTarget();
        const input = new Input({
            formats: ALL_FORMATS,
            source: new BlobSource(new Blob([request.input])),
        });
        const output = new Output({ format: new Mp4OutputFormat(), target });
        const conversion = await Conversion.init({ input, output, copy: false });
        this.conversion = conversion;
        try {
            await conversion.execute(request.signal ? { pauseSignal: request.signal } : {});
        } catch (error) {
            if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
            throw error;
        } finally {
            this.conversion = null;
        }
        if (request.signal?.aborted) {
            await conversion.cancel();
            throw new DOMException("Aborted", "AbortError");
        }
        if (!target.buffer) throw new Error("Mediabunny transcoder produced no output.");
        return target.buffer;
    }
}
