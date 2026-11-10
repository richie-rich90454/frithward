import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "@frithward/contracts";
import { ExportCaptionsUseCase } from "../application/ExportCaptionsUseCase.js";

const ExportRequest = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    language: z.string().min(1),
    format: z.enum(["vtt", "srt"]),
    segments: z.array(
        z.object({
            id: z.string().min(1),
            startMs: z.number().int().nonnegative(),
            endMs: z.number().int().positive(),
            text: z.string().min(1),
            speakerId: z.string().nullable().optional(),
        }),
    ),
});

export class MediaWorkerRoutes extends Hono {
    public constructor(private readonly exportCaptions: ExportCaptionsUseCase) {
        super();
        this.get("/health", (context) => context.json({ status: "ok", service: "media-worker" }));
        this.post("/api/media/captions/export", async (context) => {
            const parsed = ExportRequest.safeParse(await context.req.json<unknown>());
            if (!parsed.success) {
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Validation failed.",
                );
            }
            const content = this.exportCaptions.execute({
                projectId: parsed.data.projectId,
                title: parsed.data.title,
                language: parsed.data.language,
                format: parsed.data.format,
                segments: parsed.data.segments.map((segment) => ({
                    id: segment.id,
                    startMs: segment.startMs,
                    endMs: segment.endMs,
                    text: segment.text,
                    speakerId: segment.speakerId ?? null,
                })),
            });
            return context.text(content, 200, {
                "Content-Type": parsed.data.format === "vtt" ? "text/vtt" : "application/x-subrip",
            });
        });
    }
}
