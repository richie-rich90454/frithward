/**
 * Packages decoded PCM channels into a real, playable 16-bit WAV Blob.
 *
 * The media TranscoderPort reports only chunk/byte counts, so the encoded AAC
 * bytes are never exposed to this feature. The decoded PCM is the genuine
 * processed audio available here; WAV is a lossless container for it.
 */
function writeAscii(view: DataView, offset: number, text: string): void {
    for (let index = 0; index < text.length; index += 1) {
        view.setUint8(offset + index, text.charCodeAt(index));
    }
}

/** O(n) in the total sample count: one pass to interleave channels into the data chunk. */
export function encodeWav(channels: readonly Float32Array[], sampleRate: number): Blob {
    const numChannels = Math.max(1, channels.length);
    const frames = channels[0]?.length ?? 0;
    const bytesPerSample = 2;
    const dataSize = frames * numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let frame = 0; frame < frames; frame += 1) {
        for (let channel = 0; channel < numChannels; channel += 1) {
            const value = channels[channel]?.[frame] ?? 0;
            const clamped = Math.max(-1, Math.min(1, value));
            view.setInt16(
                offset,
                clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
                true,
            );
            offset += bytesPerSample;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
}
