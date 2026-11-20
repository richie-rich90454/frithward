import { readToken } from "../../../../theme/tokens.js";

const PEAK_THRESHOLD = 0.6;

export interface WaveformColors {
    bar?: string;
    accent?: string;
}

/**
 * Draws a mirrored bar waveform from a precomputed amplitude envelope.
 * Headless: receives a canvas and numbers only; no decoding or solid-js here.
 *
 * O(buckets) time: one pass over `samples` with constant work per bucket.
 */
export function paintWaveform(
    canvas: HTMLCanvasElement,
    samples: readonly number[],
    colors: WaveformColors = {},
): void {
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (samples.length === 0 || width === 0 || height === 0) return;

    const bar = colors.bar ?? readToken("--fw-color-text-secondary", "#6b6b6b");
    const accentColor = colors.accent ?? readToken("--fw-color-accent", "#a3481b");
    const barWidth = width / samples.length;
    const drawWidth = Math.max(1, barWidth > 2 ? barWidth - 1 : barWidth);
    const mid = height / 2;

    for (let index = 0; index < samples.length; index += 1) {
        const amplitude = Math.max(0, Math.min(1, samples[index] ?? 0));
        const barHeight = amplitude * mid;
        const x = index * barWidth;
        context.fillStyle = bar;
        context.fillRect(x, mid - barHeight, drawWidth, barHeight * 2);
        if (amplitude >= PEAK_THRESHOLD) {
            const accent = Math.max(1, barHeight * 0.18);
            context.fillStyle = accentColor;
            context.fillRect(x, mid - barHeight, drawWidth, accent);
            context.fillRect(x, mid + barHeight - accent, drawWidth, accent);
        }
    }

    context.fillStyle = accentColor;
    context.fillRect(0, mid - 0.5, width, 1);
}
