import { OpenAPIHono } from "@hono/zod-openapi";
import { randomUUID } from "node:crypto";
import { AnalyzeMessageUseCase } from "@frithward/security-core";
import { analyzeMessageRoute } from "../../../../presentation/http/routes.js";
import { validationHook } from "../../../../presentation/http/validationHook.js";
import type { JobQueue } from "../../../../jobs/queue.js";
import type { JobStatusStore } from "../../../../jobs/jobStore.js";

export class ScamAnalysisRoutes extends OpenAPIHono {
    public constructor(
        private readonly queue: JobQueue | null,
        private readonly store: JobStatusStore,
        private readonly useCase: AnalyzeMessageUseCase = new AnalyzeMessageUseCase(),
    ) {
        super({ defaultHook: validationHook });
        this.openapi(analyzeMessageRoute, async (context) => {
            const body = context.req.valid("json");

            // Local-first: analyse synchronously and return the full result without Postgres.
            // The queue is opt-in (ENABLE_JOB_QUEUE=1 together with DATABASE_URL); if it is
            // unavailable or enqueueing fails we fall back to the synchronous path rather
            // than returning 500.
            if (this.queue !== null) {
                try {
                    const { jobId } = await this.queue.enqueueAnalysis(body.text);
                    this.store.record(jobId, "queued");
                    return context.json({ jobId }, 202);
                } catch {
                    // fall through to synchronous analysis
                }
            }

            const analysis = this.useCase.execute(body.text);
            return context.json(
                {
                    id: randomUUID(),
                    channel: "message" as const,
                    indicators: [...analysis.indicators],
                    summary: analysis.summary,
                    nextSteps: [...analysis.nextSteps],
                    limitations: [...analysis.limitations],
                    createdAt: new Date().toISOString(),
                },
                200,
            );
        });
    }
}
