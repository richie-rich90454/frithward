import { CaptionProject } from "../../domain/CaptionProject.js";
import { SubtitleSegment } from "../../domain/SubtitleSegment.js";

export interface CaptionStudioViewModelSegment {
    id: string;
    startMs: number;
    endMs: number;
    text: string;
    speakerId: string | null;
}

export class CaptionStudioViewModel {
    public readonly projectId: string;
    public readonly title: string;
    public readonly language: string;
    public readonly segments: readonly CaptionStudioViewModelSegment[];
    public readonly selectedSegmentId: string | null;

    private constructor(input: {
        projectId: string;
        title: string;
        language: string;
        segments: readonly CaptionStudioViewModelSegment[];
        selectedSegmentId: string | null;
    }) {
        this.projectId = input.projectId;
        this.title = input.title;
        this.language = input.language;
        this.segments = input.segments;
        this.selectedSegmentId = input.selectedSegmentId;
    }
    public static fromProject(
        project: CaptionProject,
        selectedSegmentId: string | null,
    ): CaptionStudioViewModel {
        const segments = project.listSegments().map((segment) => ({
            id: segment.id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            text: segment.text,
            speakerId: segment.speakerId,
        }));
        return new CaptionStudioViewModel({
            projectId: project.id,
            title: project.title,
            language: project.language,
            segments,
            selectedSegmentId,
        });
    }

    public static createSegment(
        id: string,
        startMs: number,
        endMs: number,
        text: string,
        speakerId: string | null,
    ): CaptionStudioViewModelSegment {
        void new SubtitleSegment({ id, startMs, endMs, text, speakerId });
        return { id, startMs, endMs, text, speakerId };
    }
}
