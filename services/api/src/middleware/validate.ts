import type { Context } from "hono";
import { AppError } from "@frithward/contracts";
import type { z } from "zod";

export async function parseJson<T>(context: Context, schema: z.ZodType<T>): Promise<T> {
    let data: unknown;
    try {
        data = await context.req.json<unknown>();
    } catch {
        throw new AppError("VALIDATION_FAILED", "Invalid JSON body.");
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
        throw new AppError(
            "VALIDATION_FAILED",
            parsed.error.issues[0]?.message ?? "Validation failed.",
        );
    }
    return parsed.data;
}
