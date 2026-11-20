import type { Context, Next } from "hono";
import { RedactPrivacyUseCase } from "@frithward/privacy-core";
import { Hono } from "hono";
import { Counter, Gauge, Histogram, Registry } from "prom-client";
import { SubmitReportUseCase } from "./application/SubmitReportUseCase.js";
import { createReportRepository } from "./infrastructure/DatabaseReportRepository.js";
import { CommunityRoutes } from "./presentation/CommunityRoutes.js";
import { errorHandler } from "./presentation/errorHandler.js";

const serviceName = "community";

// DATABASE_URL opts into persistent storage; without it this service stays local-first.
export const reports = createReportRepository(process.env.DATABASE_URL);

export const metricsRegistry = new Registry();

const httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests.",
    labelNames: ["method", "path", "status"],
    registers: [metricsRegistry],
});

const httpRequestDurationSeconds = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds.",
    labelNames: ["method", "path"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [metricsRegistry],
});

const serviceUp = new Gauge({
    name: "frithward_service_up",
    help: "Whether the service is serving (1 while it answers).",
    labelNames: ["service"],
    registers: [metricsRegistry],
});
serviceUp.set({ service: serviceName }, 1);

new Gauge({
    name: "process_uptime_seconds",
    help: "Process uptime in seconds.",
    registers: [metricsRegistry],
    collect() {
        this.set(process.uptime());
    },
});

async function metricsMiddleware(context: Context, next: Next): Promise<void> {
    const observe = httpRequestDurationSeconds.startTimer();
    await next();
    const path = context.req.routePath || context.req.path;
    const labels = { method: context.req.method, path };
    httpRequestsTotal.inc({ ...labels, status: String(context.res.status) });
    observe(labels);
}

export function createApp(): Hono {
    const app = new Hono();
    app.onError(errorHandler);
    app.use("*", metricsMiddleware);
    app.route(
        "/",
        new CommunityRoutes(
            new SubmitReportUseCase(new RedactPrivacyUseCase(), reports.repository),
            reports.repository,
        ),
    );
    app.get("/metrics", async (context) => {
        const body = await metricsRegistry.metrics();
        return context.newResponse(body, 200, { "Content-Type": metricsRegistry.contentType });
    });
    return app;
}
