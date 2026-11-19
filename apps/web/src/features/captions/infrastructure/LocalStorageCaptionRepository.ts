import { AppError } from "@frithward/contracts";
import { CaptionProject, SubtitleSegment } from "@frithward/media-core";
import type { CaptionRepository } from "@frithward/media-core";

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

interface SegmentRecord {
    id: string;
    startMs: number;
    endMs: number;
    text: string;
    speakerId: string | null;
}

interface ProjectRecord {
    id: string;
    title: string;
    language: string;
    segments: SegmentRecord[];
}

const KEY_PREFIX = "frithward.caption.";

export class LocalStorageCaptionRepository implements CaptionRepository {
    public constructor(private readonly storage: StorageLike | null = null) {}

    public async save(project: CaptionProject): Promise<void> {
        const record: ProjectRecord = {
            id: project.id,
            title: project.title,
            language: project.language,
            segments: project.listSegments().map((segment) => ({
                id: segment.id,
                startMs: segment.startMs,
                endMs: segment.endMs,
                text: segment.text,
                speakerId: segment.speakerId,
            })),
        };
        this.store().setItem(KEY_PREFIX + project.id, JSON.stringify(record));
    }

    public async load(id: string): Promise<CaptionProject | null> {
        const raw = this.store().getItem(KEY_PREFIX + id);
        if (raw === null) return null;
        let record: ProjectRecord;
        try {
            record = JSON.parse(raw) as ProjectRecord;
        } catch (cause) {
            throw new AppError("PROCESSING_FAILED", `Stored caption "${id}" is not valid JSON.`, cause);
        }
        if (
            typeof record?.id !== "string" ||
            typeof record.title !== "string" ||
            typeof record.language !== "string" ||
            !Array.isArray(record.segments)
        ) {
            throw new AppError("PROCESSING_FAILED", `Stored caption "${id}" has an invalid shape.`);
        }
        const project = new CaptionProject({
            id: record.id,
            title: record.title,
            language: record.language,
        });
        for (const segment of record.segments) {
            project.addSegment(
                new SubtitleSegment({
                    id: segment.id,
                    startMs: segment.startMs,
                    endMs: segment.endMs,
                    text: segment.text,
                    speakerId: segment.speakerId,
                }),
            );
        }
        return project;
    }

    private store(): StorageLike {
        const storage = this.storage ?? globalThis.localStorage;
        if (!storage) {
            throw new AppError("EXTERNAL_UNAVAILABLE", "localStorage is not available in this environment.");
        }
        return storage;
    }
}
