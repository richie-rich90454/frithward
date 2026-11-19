import type { Context, Next } from "hono";
import { Hono } from "hono";
import { Counter, Histogram, Registry } from "prom-client";

export const metricsRegistry = new Registry();

export const httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds.",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [metricsRegistry],
});

export const analysesTotal = new Counter({
    name: "analyses_total",
    help: "Total number of analyses performed.",
    registers: [metricsRegistry],
});

export function recordAnalysis(): void {
    analysesTotal.inc();
}

export async function metricsMiddleware(context: Context, next: Next): Promise<void> {
    const observe = httpRequestDuration.startTimer();
    await next();
    observe({
        method: context.req.method,
        route: context.req.routePath || context.req.path,
        status: String(context.res.status),
    });
}

export function createMetricsRoutes(): Hono {
    const app = new Hono();
    app.get("/metrics", async (context) => {
        const body = await metricsRegistry.metrics();
        return context.newResponse(body, 200, { "Content-Type": metricsRegistry.contentType });
    });
    return app;
}
