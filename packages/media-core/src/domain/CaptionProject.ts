import { AppError } from "@frithward/contracts";
import { CaptionPolicy } from "./CaptionPolicy.js";
import { SubtitleSegment } from "./SubtitleSegment.js";

export class CaptionProject {
    public readonly id: string;
    public title: string;
    public language: string;
    private readonly segments: SubtitleSegment[];
    private readonly policy: CaptionPolicy;

    public constructor(input: {
        id: string;
        title: string;
        language: string;
        policy?: CaptionPolicy;
    }) {
        if (input.id.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Project id required.");
        if (input.title.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Project title required.");
        if (input.language.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Project language required.");
        this.id = input.id;
        this.title = input.title;
        this.language = input.language;
        this.segments = [];
        this.policy = input.policy ?? new CaptionPolicy();
    }

    public listSegments(): readonly SubtitleSegment[] {
        return [...this.segments].sort((a, b) => a.startMs - b.startMs);
    }

    public getSegment(id: string): SubtitleSegment {
        const found = this.segments.find((segment) => segment.id === id);
        if (!found) throw new AppError("NOT_FOUND", `Segment ${id} not found.`);
        return found;
    }

    public addSegment(segment: SubtitleSegment): void {
        this.policy.assertNoOverlap(this.segments, segment);
        this.segments.push(segment);
    }

    public replaceSegment(segment: SubtitleSegment): void {
        const index = this.segments.findIndex((candidate) => candidate.id === segment.id);
        if (index === -1) throw new AppError("NOT_FOUND", `Segment ${segment.id} not found.`);
        const others = this.segments.filter((candidate) => candidate.id !== segment.id);
        this.policy.assertNoOverlap(others, segment);
        this.segments[index] = segment;
    }

    public removeSegment(id: string): void {
        const index = this.segments.findIndex((candidate) => candidate.id === id);
        if (index === -1) throw new AppError("NOT_FOUND", `Segment ${id} not found.`);
        this.segments.splice(index, 1);
    }

    public get segmentCount(): number {
        return this.segments.length;
    }
}
