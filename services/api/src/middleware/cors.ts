import type { MiddlewareHandler } from "hono";

// With an empty allowlist no CORS headers are emitted, so the browser treats
// requests as same-origin only. Configure CORS_ORIGIN (comma separated) to allow
// specific cross-origin clients.
export function cors(allowedOrigins: readonly string[] = []): MiddlewareHandler {
    return async (context, next) => {
        const origin = context.req.header("Origin");
        if (origin && allowedOrigins.includes(origin)) {
            context.header("Access-Control-Allow-Origin", origin);
            context.header("Vary", "Origin");
        }
        context.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        context.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (context.req.method === "OPTIONS") return context.body(null, 204);
        return next();
    };
}
