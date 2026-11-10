import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { CommunityRoutes } from "./presentation/CommunityRoutes.js";
import { SubmitReportUseCase } from "./application/SubmitReportUseCase.js";
import { InMemoryReportRepository } from "./infrastructure/InMemoryReportRepository.js";
import { RedactPrivacyUseCase } from "@frithward/privacy-core";
import { errorHandler } from "./presentation/errorHandler.js";

const repository = new InMemoryReportRepository();

const app = new Hono();
app.onError(errorHandler);
app.route(
    "/",
    new CommunityRoutes(
        new SubmitReportUseCase(new RedactPrivacyUseCase(), repository),
        repository,
    ),
);

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3004),
});
