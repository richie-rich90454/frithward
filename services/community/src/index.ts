import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { CommunityRoutes } from "./presentation/CommunityRoutes.js";
import { SubmitReportUseCase } from "./application/SubmitReportUseCase.js";
import { createReportRepository } from "./infrastructure/DatabaseReportRepository.js";
import { RedactPrivacyUseCase } from "@frithward/privacy-core";
import { errorHandler } from "./presentation/errorHandler.js";

// DATABASE_URL opts into persistent storage; without it this service stays local-first.
const reports = createReportRepository(process.env.DATABASE_URL);

const app = new Hono();
app.onError(errorHandler);
app.route(
    "/",
    new CommunityRoutes(
        new SubmitReportUseCase(new RedactPrivacyUseCase(), reports.repository),
        reports.repository,
    ),
);

const serviceName = "community";
app.get("/metrics", (context) =>
    context.text(
        [
            "# HELP frithward_service_up Whether the service is serving (1 while it answers).",
            "# TYPE frithward_service_up gauge",
            `frithward_service_up{service="${serviceName}"} 1`,
            "# HELP process_uptime_seconds Process uptime in seconds.",
            "# TYPE process_uptime_seconds gauge",
            `process_uptime_seconds ${process.uptime().toFixed(3)}`,
            "",
        ].join("\n"),
        200,
        { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    ),
);

const server = serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3004),
});

let closing = false;
const shutdown = () => {
    if (closing) return;
    closing = true;
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    server.close(async () => {
        try {
            await reports.close();
        } finally {
            clearTimeout(forceExit);
            process.exit(0);
        }
    });
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
