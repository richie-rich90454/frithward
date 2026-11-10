import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { IncidentRoutes } from "./presentation/IncidentRoutes.js";
import { IncidentService } from "./application/IncidentService.js";
import { InMemoryIncidentRepository } from "./infrastructure/InMemoryIncidentRepository.js";
import { errorHandler } from "./presentation/errorHandler.js";

const app = new Hono();
app.onError(errorHandler);
app.route("/", new IncidentRoutes(new IncidentService(new InMemoryIncidentRepository())));

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3005),
});
