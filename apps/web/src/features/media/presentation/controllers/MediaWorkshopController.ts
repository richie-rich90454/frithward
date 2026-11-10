import { CaptionProject, EditSubtitleUseCase, SubtitleSegment } from "@frithward/media-core";
import type { CaptionRepository } from "@frithward/media-core";

class MemoryMediaRepository implements CaptionRepository {
    public async save(_project: CaptionProject): Promise<void> {
        return;
    }

    public async load(_id: string): Promise<CaptionProject | null> {
        return null;
    }
}

export interface MediaWorkshopSegment {
    id: string;
    startMs: number;
    endMs: number;
    text: string;
}

export class MediaWorkshopController {
    private readonly project: CaptionProject;
    private readonly editor: EditSubtitleUseCase;
    private readonly listeners = new Set<() => void>();
    private selectedSegmentId: string | null = null;
    private error: string | null = null;

    public constructor() {
        this.project = new CaptionProject({
            id: "media-workshop",
            title: "Media workshop",
            language: "en",
        });
        this.editor = new EditSubtitleUseCase(new MemoryMediaRepository());
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getSegments(): readonly MediaWorkshopSegment[] {
        return this.project.listSegments().map((segment) => ({
            id: segment.id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            text: segment.text,
        }));
    }

    public getSelectedSegmentId(): string | null {
        return this.selectedSegmentId;
    }

    public getError(): string | null {
        return this.error;
    }

    public addSegment(input: { startMs: string; endMs: string; text: string }): void {
        const start = Number(input.startMs);
        const end = Number(input.endMs);
        if (!Number.isInteger(start) || !Number.isInteger(end)) {
            this.error = "Start and end must be whole milliseconds.";
            this.notify();
            return;
        }
        if (input.text.trim().length === 0) {
            this.error = "Segment text required.";
            this.notify();
            return;
        }
        try {
            this.project.addSegment(
                new SubtitleSegment({
                    id: `${this.project.id}-seg-${this.project.segmentCount}`,
                    startMs: start,
                    endMs: end,
                    text: input.text.trim(),
                }),
            );
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Could not add segment.";
        }
        this.notify();
    }

    public select(segmentId: string): void {
        try {
            this.project.getSegment(segmentId);
            this.selectedSegmentId = segmentId;
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Segment not found.";
        }
        this.notify();
    }

    public async applyEdit(input: { segmentId: string; text: string }): Promise<void> {
        try {
            await this.editor.execute({
                project: this.project,
                segmentId: input.segmentId,
                text: input.text,
            });
            this.selectedSegmentId = input.segmentId;
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Edit failed.";
        }
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
