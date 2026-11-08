import { AppError } from "@frithward/contracts";

export class SubtitleSegment {
    public readonly id: string;
    public startMs: number;
    public endMs: number;
    public text: string;
    public readonly speakerId: string | null;

    public constructor(input: {
        id: string;
        startMs: number;
        endMs: number;
        text: string;
        speakerId?: string | null;
    }) {
        if (input.id.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Segment id required.");
        if (!Number.isInteger(input.startMs) || input.startMs < 0) {
            throw new AppError(
                "VALIDATION_FAILED",
                "Segment start must be a non-negative integer.",
            );
        }
        if (!Number.isInteger(input.endMs) || input.endMs <= input.startMs) {
            throw new AppError("VALIDATION_FAILED", "Segment end must exceed start.");
        }
        if (input.text.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Segment text required.");
        this.id = input.id;
        this.startMs = input.startMs;
        this.endMs = input.endMs;
        this.text = input.text;
        this.speakerId = input.speakerId ?? null;
    }

    public get durationMs(): number {
        return this.endMs - this.startMs;
    }

    public retime(startMs: number, endMs: number): void {
        if (!Number.isInteger(startMs) || startMs < 0) {
            throw new AppError(
                "VALIDATION_FAILED",
                "Segment start must be a non-negative integer.",
            );
        }
        if (!Number.isInteger(endMs) || endMs <= startMs) {
            throw new AppError("VALIDATION_FAILED", "Segment end must exceed start.");
        }
        this.startMs = startMs;
        this.endMs = endMs;
    }

    public setText(text: string): void {
        if (text.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Segment text required.");
        this.text = text;
    }

    public overlaps(other: SubtitleSegment): boolean {
        return this.startMs < other.endMs && other.startMs < this.endMs;
    }
}
