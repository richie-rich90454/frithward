export class MediaTranscoder {
    public async convert(_input: ArrayBuffer, format: string): Promise<ArrayBuffer> {
        if (format.trim().length === 0) throw new Error("Format required.");
        return new ArrayBuffer(0);
    }
}
