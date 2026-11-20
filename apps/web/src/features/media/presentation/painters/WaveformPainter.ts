const GRAYSCALE = "#6b6b6b";
const IRON_OXIDE = "#a3481b";
const PEAK_THRESHOLD = 0.6;

/**
 * Draws a mirrored bar waveform from a precomputed amplitude envelope.
 * Headless: receives a canvas and numbers only; no decoding or solid-js here.
 *
 * O(buckets) time: one pass over `samples` with constant work per bucket.
 */
export function paintWaveform(canvas: HTMLCanvasElement, samples: readonly number[]): void {
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (samples.length === 0 || width === 0 || height === 0) return;

    const barWidth = width / samples.length;
    const drawWidth = Math.max(1, barWidth > 2 ? barWidth - 1 : barWidth);
    const mid = height / 2;

    for (let index = 0; index < samples.length; index += 1) {
        const amplitude = Math.max(0, Math.min(1, samples[index] ?? 0));
        const barHeight = amplitude * mid;
        const x = index * barWidth;
        context.fillStyle = GRAYSCALE;
        context.fillRect(x, mid - barHeight, drawWidth, barHeight * 2);
        if (amplitude >= PEAK_THRESHOLD) {
            const accent = Math.max(1, barHeight * 0.18);
            context.fillStyle = IRON_OXIDE;
            context.fillRect(x, mid - barHeight, drawWidth, accent);
            context.fillRect(x, mid + barHeight - accent, drawWidth, accent);
        }
    }

    context.fillStyle = IRON_OXIDE;
    context.fillRect(0, mid - 0.5, width, 1);
}
