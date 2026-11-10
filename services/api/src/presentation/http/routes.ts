import { createRoute } from "@hono/zod-openapi";
import {
    AnalyzeMessageRequest,
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
        202: {
            description: "Analysis job queued.",
            content: { "application/json": { schema: EnqueueAnalysisResponse } },
        },
    },
});

export const sessionRoute = createRoute({
    method: "get",
    path: "/api/auth/session",
    responses: {
        200: {
            description: "Auth configuration status.",
            content: { "application/json": { schema: SessionResponse } },
        },
    },
});
