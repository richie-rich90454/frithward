import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { MediaWorkerRoutes } from "./presentation/MediaWorkerRoutes.js";
import { ExportCaptionsUseCase } from "./application/ExportCaptionsUseCase.js";
import { MediaCoreSubtitleRenderer } from "./infrastructure/MediaCoreSubtitleRenderer.js";
import { errorHandler } from "./presentation/errorHandler.js";

const app = new Hono();
app.onError(errorHandler);
app.route("/", new MediaWorkerRoutes(new ExportCaptionsUseCase(new MediaCoreSubtitleRenderer())));

const serviceName = "media-worker";
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
    port: Number(process.env.PORT ?? 3002),
});

let closing = false;
const shutdown = () => {
    if (closing) return;
    closing = true;
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    server.close(() => {
        clearTimeout(forceExit);
        process.exit(0);
    });
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
