import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { MediaWorkerRoutes } from "./presentation/MediaWorkerRoutes.js";
import { ExportCaptionsUseCase } from "./application/ExportCaptionsUseCase.js";
import { MediaCoreSubtitleRenderer } from "./infrastructure/MediaCoreSubtitleRenderer.js";
import { errorHandler } from "./presentation/errorHandler.js";

const app = new Hono();
app.onError(errorHandler);
app.route("/", new MediaWorkerRoutes(new ExportCaptionsUseCase(new MediaCoreSubtitleRenderer())));

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3002),
});
