import { Hono } from "hono";
import { AppError, CreateCaseInput, UpdateCaseInput } from "@frithward/contracts";
import type { z } from "zod";
import type { CaseStore } from "./CaseStore.js";

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new AppError(
            "VALIDATION_FAILED",
            result.error.issues[0]?.message ?? "Validation failed.",
        );
    }
    return result.data;
}

/** Explicit, opt-in Case CRUD. Availability is checked per request so no-DB runs return 503. */
export class CaseRoutes extends Hono {
    public constructor(private readonly store: CaseStore | null) {
        super();

        this.post("/api/cases", async (context) => {
            const store = this.required();
            const input = parse(CreateCaseInput, await context.req.json<unknown>());
            return context.json(await store.create(input), 201);
        });

        this.get("/api/cases", async (context) => {
            return context.json({ cases: await this.required().list() }, 200);
        });

        this.get("/api/cases/:id", async (context) => {
            const record = await this.required().get(context.req.param("id"));
            if (!record) throw new AppError("NOT_FOUND", "Case not found.");
            return context.json(record, 200);
        });

        this.patch("/api/cases/:id", async (context) => {
            const store = this.required();
            const input = parse(UpdateCaseInput, await context.req.json<unknown>());
            const record = await store.update(context.req.param("id"), input);
            if (!record) throw new AppError("NOT_FOUND", "Case not found.");
            return context.json(record, 200);
        });

        this.delete("/api/cases/:id", async (context) => {
            if (!(await this.required().remove(context.req.param("id"))))
                throw new AppError("NOT_FOUND", "Case not found.");
            return context.body(null, 204);
        });
    }

    private required(): CaseStore {
        if (!this.store)
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "Case storage is not configured. Set DATABASE_URL to enable it.",
            );
        return this.store;
    }
}
