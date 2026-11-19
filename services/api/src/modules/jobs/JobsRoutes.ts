import { Hono } from "hono";
import { AppError } from "@frithward/contracts";
import type { JobStatusStore } from "../../jobs/jobStore.js";

export class JobsRoutes extends Hono {
    public constructor(private readonly store: JobStatusStore) {
        super();
        this.get("/api/jobs/:id", async (context) => {
            const id = context.req.param("id");
            const record = await this.store.get(id);
            if (!record) throw new AppError("NOT_FOUND", `Job ${id} not found.`);
            return context.json(record, 200);
        });
    }
}
