import type { MiddlewareHandler } from "hono";

export interface RateLimiterOptions {
    windowMs?: number;
    limit?: number;
}

export function createRateLimiter({
    windowMs = 60_000,
    limit = 60,
}: RateLimiterOptions = {}): MiddlewareHandler {
    const hits = new Map<string, { count: number; resetAt: number }>();
    return async (context, next) => {
        const ip =
            context.req.header("cf-connecting-ip") ??
            context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
            "unknown";
        const now = Date.now();
        if (hits.size > 1000) {
            for (const [key, value] of hits) if (now >= value.resetAt) hits.delete(key);
        }
        const entry = hits.get(ip);
        if (!entry || now >= entry.resetAt) {
            hits.set(ip, { count: 1, resetAt: now + windowMs });
        } else if (entry.count >= limit) {
            context.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
            return context.json({ code: "RATE_LIMITED", message: "Too many requests." }, 429);
        } else {
            entry.count += 1;
        }
        return next();
    };
}
