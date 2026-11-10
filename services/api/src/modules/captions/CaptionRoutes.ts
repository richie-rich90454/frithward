import { Hono } from "hono";
import { CaptionProject, ExportSubtitlesUseCase, SubtitleSegment } from "@frithward/media-core";
import { CaptionExportRequest } from "../../presentation/http/schemas.js";
import { parseJson } from "../../middleware/validate.js";

export class CaptionRoutes extends Hono {
    public constructor(
        private readonly useCase: ExportSubtitlesUseCase = new ExportSubtitlesUseCase(),
    ) {
        super();
        this.post("/api/captions/export", async (context) => {
            const body = await parseJson(context, CaptionExportRequest);
            const project = new CaptionProject({
                id: body.projectId,
                title: body.title,
                language: body.language,
            });
            for (const segment of body.segments) {
                project.addSegment(
                    new SubtitleSegment({
                        id: segment.id,
                        startMs: segment.startMs,
                        endMs: segment.endMs,
                        text: segment.text,
                        speakerId: segment.speakerId ?? null,
                    }),
                );
            }
            const content = this.useCase.execute({ project, format: body.format });
            return context.text(content, 200, {
                "Content-Type": body.format === "vtt" ? "text/vtt" : "application/x-subrip",
            });
        });
    }
}
