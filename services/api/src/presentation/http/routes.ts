import { createRoute } from "@hono/zod-openapi";
import {
    AnalyzeMessageRequest,
    AnalyzeMessageResponse,
    EnqueueAnalysisResponse,
    HealthResponse,
    SessionResponse,
} from "./schemas.js";

export const healthRoute = createRoute({
    method: "get",
    path: "/health",
    responses: {
        200: {
            description: "Service status.",
            content: { "application/json": { schema: HealthResponse } },
        },
    },
});

export const analyzeMessageRoute = createRoute({
    method: "post",
    path: "/api/scam/message",
    request: {
        body: {
            required: true,
            content: { "application/json": { schema: AnalyzeMessageRequest } },
        },
    },
    responses: {
        200: {
            description: "Synchronous analysis result (local-first default).",
            content: { "application/json": { schema: AnalyzeMessageResponse } },
        },
        202: {
            description: "Analysis job queued.",
            content: { "application/json": { schema: EnqueueAnalysisResponse } },
        },
        400: {
            description: "Invalid request body.",
        },
    },
});

export const sessionRoute = createRoute({
    method: "get",
    path: "/api/auth/session",
    responses: {
        200: {
            description: "Actual session state.",
            content: { "application/json": { schema: SessionResponse } },
        },
        503: {
            description: "Authentication backend unavailable.",
        },
    },
});
