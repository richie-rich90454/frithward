import { CaptionProject, ExportSubtitlesUseCase, SubtitleSegment } from "@frithward/media-core";
import type { SubtitleRenderRequest, SubtitleRenderer } from "../ports/SubtitleRenderer.js";

export class MediaCoreSubtitleRenderer implements SubtitleRenderer {
    private readonly useCase: ExportSubtitlesUseCase;

    public constructor(useCase: ExportSubtitlesUseCase = new ExportSubtitlesUseCase()) {
        this.useCase = useCase;
    }

    public render(input: SubtitleRenderRequest): string {
        const project = new CaptionProject({
            id: input.projectId,
            title: input.title,
            language: input.language,
        });
        for (const segment of input.segments) {
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
        return this.useCase.execute({ project, format: input.format });
    }
}
