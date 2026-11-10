import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { OrchestratorRoutes } from "./presentation/OrchestratorRoutes.js";
import { DispatchAnalysisUseCase } from "./application/DispatchAnalysisUseCase.js";
import { HttpWorkerClient } from "./infrastructure/HttpWorkerClient.js";
import { errorHandler } from "./presentation/errorHandler.js";

const workerUrl = process.env.INFERENCE_WORKER_URL ?? "http://localhost:3003";

const app = new Hono();
app.onError(errorHandler);
app.route(
    "/",
    new OrchestratorRoutes(new DispatchAnalysisUseCase(new HttpWorkerClient(workerUrl))),
);

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3001),
});
