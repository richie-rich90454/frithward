export const PCM_TARGET_RATE = 16_000;
export const PCM_CHUNK_MS = 20;

/** Linear-interpolation resample and mono mixdown to signed 16-bit PCM. */
export function downsampleToPcm16(
    input: Float32Array,
    sourceRate: number,
    channels = 1,
    targetRate = PCM_TARGET_RATE,
): Int16Array {
    if (sourceRate <= 0 || channels < 1 || targetRate <= 0)
        throw new RangeError("Invalid sample rate or channel count.");
    const frames = Math.floor(input.length / channels);
    const outputLength = Math.max(0, Math.floor(frames * (targetRate / sourceRate)));
    const output = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        const position = (i * sourceRate) / targetRate;
        const frame = Math.floor(position);
        const fraction = position - frame;
        let sample = 0;
        for (let channel = 0; channel < channels; channel++) {
            const first = input[Math.min(frame * channels + channel, input.length - 1)] ?? 0;
            const second =
                input[Math.min((frame + 1) * channels + channel, input.length - 1)] ?? 0;
            sample += first + (second - first) * fraction;
        }
        sample /= channels;
        const clamped = Math.max(-1, Math.min(1, sample));
        output[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    }
    return output;
}

export function interleaveChannels(channels: readonly Float32Array[]): Float32Array {
    const first = channels[0];
    if (!first) return new Float32Array(0);
    const interleaved = new Float32Array(first.length * channels.length);
    for (let channel = 0; channel < channels.length; channel++) {
        const data = channels[channel];
        if (!data) continue;
        for (let frame = 0; frame < first.length; frame++)
            interleaved[frame * channels.length + channel] = data[frame] ?? 0;
    }
    return interleaved;
}
