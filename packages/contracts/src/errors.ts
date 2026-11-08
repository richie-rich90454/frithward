import { z } from "zod";

export const ErrorCode = z.enum([
    "VALIDATION_FAILED",
    "NOT_FOUND",
    "CONFLICT",
    "CANCELLED",
    "PROCESSING_FAILED",
    "EXTERNAL_UNAVAILABLE",
    "UNAUTHORIZED",
]);

export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiError = z.object({
    code: ErrorCode,
    message: z.string(),
    cause: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiError>;

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly causeMessage: string | undefined;
    public constructor(code: ErrorCode, message: string, cause?: unknown) {
        super(message, cause !== undefined ? { cause } : undefined);
        this.name = "AppError";
        this.code = code;
        this.causeMessage = cause instanceof Error ? cause.message : undefined;
    }
}
