import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { InferenceWorkerRoutes } from "./presentation/InferenceWorkerRoutes.js";
import { AnalyzeTextUseCase } from "./application/AnalyzeTextUseCase.js";
import { SecurityCoreTextAnalysisEngine } from "./infrastructure/SecurityCoreTextAnalysisEngine.js";
import { errorHandler } from "./presentation/errorHandler.js";

const app = new Hono();
app.onError(errorHandler);
app.route(
    "/",
    new InferenceWorkerRoutes(new AnalyzeTextUseCase(new SecurityCoreTextAnalysisEngine())),
);

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3003),
});
