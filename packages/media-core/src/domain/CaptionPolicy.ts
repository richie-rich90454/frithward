import { AppError } from "@frithward/contracts";
import { SubtitleSegment } from "./SubtitleSegment.js";

export class CaptionPolicy {
    public readonly maxLineLength: number;
    public readonly maxDurationMs: number;

    public constructor(input?: { maxLineLength?: number; maxDurationMs?: number }) {
        this.maxLineLength = input?.maxLineLength ?? 42;
        this.maxDurationMs = input?.maxDurationMs ?? 20000;
    }

    // Complexity: O(n) scan over existing segments for overlap checks.
    public assertNoOverlap(existing: readonly SubtitleSegment[], candidate: SubtitleSegment): void {
        for (const segment of existing) {
            if (segment.overlaps(candidate)) {
                throw new AppError("CONFLICT", `Segment overlaps ${segment.id}.`);
            }
        }
        if (candidate.durationMs > this.maxDurationMs) {
            throw new AppError("VALIDATION_FAILED", "Segment duration exceeds policy limit.");
        }
        if (candidate.text.length > this.maxLineLength * 2) {
            throw new AppError("VALIDATION_FAILED", "Segment text exceeds policy limit.");
        }
    }
}
