import { OpenAPIHono } from "@hono/zod-openapi";
import { analyzeMessageRoute } from "../../../../presentation/http/routes.js";
import { validationHook } from "../../../../presentation/http/validationHook.js";
import type { JobQueue } from "../../../../jobs/queue.js";
import type { JobStatusStore } from "../../../../jobs/jobStore.js";

export class ScamAnalysisRoutes extends OpenAPIHono {
    public constructor(
        private readonly queue: JobQueue,
        private readonly store: JobStatusStore,
    ) {
        super({ defaultHook: validationHook });
        this.openapi(analyzeMessageRoute, async (context) => {
            const body = context.req.valid("json");
            const { jobId } = await this.queue.enqueueAnalysis(body.text);
            this.store.record(jobId, "queued");
            return context.json({ jobId }, 202);
        });
    }
}
