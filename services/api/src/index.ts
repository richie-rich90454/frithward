import "./telemetry/instrumentation.js";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createScamModule } from "./modules/scam-analysis/composition/createScamAnalysisModule.js";
import { createAuthModule } from "./modules/auth/composition/createAuthModule.js";
import { HealthRoutes, createDatabaseHealthCheck } from "./modules/health/HealthRoutes.js";
import { PrivacyRoutes } from "./modules/privacy/PrivacyRoutes.js";
import { ProvenanceRoutes } from "./modules/provenance/ProvenanceRoutes.js";
import { CaptionRoutes } from "./modules/captions/CaptionRoutes.js";
import { JobsRoutes } from "./modules/jobs/JobsRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireSession } from "./middleware/requireSession.js";
import { cors } from "./middleware/cors.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { bodySizeLimit } from "./middleware/bodySize.js";
import { GraphileJobQueue } from "./jobs/queue.js";
import { sharedJobStore } from "./jobs/jobStore.js";
import { openApiDocument } from "./openapi.js";
import { createMetricsRoutes, metricsMiddleware } from "./telemetry/metrics.js";

const databaseUrl = process.env.DATABASE_URL;

const app = new Hono();
app.onError(errorHandler);
app.use("*", metricsMiddleware);

app.use(
    "*",
    cors(
        (process.env.CORS_ORIGIN ?? "")
            .split(",")
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0),
    ),
);
app.use("*", bodySizeLimit());
app.use("/api/scam/message", createRateLimiter({ windowMs: 60_000, limit: 60 }));

const queue =
    process.env.ENABLE_JOB_QUEUE === "1" && databaseUrl ? new GraphileJobQueue(databaseUrl) : null;
const scams = createScamModule(queue, sharedJobStore);
const auth = createAuthModule(databaseUrl);
const databaseHealth = createDatabaseHealthCheck(databaseUrl);

app.use("/api/privacy/*", requireSession(auth.sessionPort));
app.use("/api/provenance/*", requireSession(auth.sessionPort));
app.use("/api/captions/*", requireSession(auth.sessionPort));

app.route("/", createMetricsRoutes());
app.route("/", new HealthRoutes(databaseHealth.check, databaseHealth.configured));
app.route("/", scams.routes);
app.route("/", auth.routes);
app.route("/", new PrivacyRoutes());
app.route("/", new ProvenanceRoutes());
app.route("/", new CaptionRoutes());
app.route("/", new JobsRoutes(sharedJobStore));

app.get("/api/openapi.json", (context) => context.json(openApiDocument));

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
});
