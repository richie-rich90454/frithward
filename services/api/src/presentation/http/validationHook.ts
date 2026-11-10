import type { OpenAPIHonoOptions } from "@hono/zod-openapi";
import type { Env } from "hono";
import { AppError } from "@frithward/contracts";

export const validationHook: NonNullable<OpenAPIHonoOptions<Env>["defaultHook"]> = (result) => {
    if (!result.success) {
        throw new AppError(
            "VALIDATION_FAILED",
            result.error.issues[0]?.message ?? "Validation failed.",
        );
    }
};
