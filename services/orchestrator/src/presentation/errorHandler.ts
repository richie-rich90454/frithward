import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError, type ErrorCode } from "@frithward/contracts";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
    VALIDATION_FAILED: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    CANCELLED: 499,
    PROCESSING_FAILED: 500,
    EXTERNAL_UNAVAILABLE: 503,
    UNAUTHORIZED: 401,
};

export const errorHandler: ErrorHandler = (error, context) => {
    if (error instanceof AppError) {
        return context.json(
            { code: error.code, message: error.message },
            STATUS_BY_CODE[error.code] as ContentfulStatusCode,
        );
    }
    return context.json({ code: "PROCESSING_FAILED", message: "Internal server error." }, 500);
};
