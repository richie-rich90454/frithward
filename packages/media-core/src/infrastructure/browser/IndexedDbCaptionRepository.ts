import { Dexie, type Table } from "dexie";
import { CaptionProject } from "../../domain/CaptionProject.js";
import { SubtitleSegment } from "../../domain/SubtitleSegment.js";
import type { CaptionRepository } from "../../ports/CaptionRepository.js";

interface CaptionSegmentRecord {
    id: string;
    startMs: number;
    endMs: number;
    text: string;
    speakerId: string | null;
}

interface CaptionProjectRecord {
    id: string;
    title: string;
    language: string;
    segments: CaptionSegmentRecord[];
}

export class IndexedDbCaptionRepository implements CaptionRepository {
    private readonly db: Dexie;
    private readonly projects: Table<CaptionProjectRecord, string>;

    public constructor(database?: Dexie) {
        this.db = database ?? new Dexie("frithward-captions");
        this.db.version(1).stores({ projects: "id" });
        this.projects = this.db.table<CaptionProjectRecord, string>("projects");
    }

    public async save(project: CaptionProject): Promise<void> {
        const record: CaptionProjectRecord = {
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
        await this.projects.put(record);
    }

    public async load(id: string): Promise<CaptionProject | null> {
        const record = await this.projects.get(id);
        if (!record) return null;
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
}
