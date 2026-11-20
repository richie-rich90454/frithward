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
import { DatabaseJobStatusStore } from "./jobs/DatabaseJobStatusStore.js";
import { sharedJobStore, type JobStatusStore } from "./jobs/jobStore.js";
import { GarageObjectStorage } from "./modules/storage/GarageObjectStorage.js";
import { StorageRoutes } from "./modules/storage/StorageRoutes.js";
import { openApiDocument } from "./openapi.js";
import { createMetricsRoutes, metricsMiddleware } from "./telemetry/metrics.js";
import { registerGracefulShutdown } from "./middleware/shutdown.js";

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

// With a database configured the store is shared across API and worker processes and survives
// restarts; without one the honest in-memory store is kept for local/no-DB runs.
const jobStore: JobStatusStore = databaseUrl
    ? new DatabaseJobStatusStore(databaseUrl)
    : sharedJobStore;
const queue =
    process.env.ENABLE_JOB_QUEUE === "1" && databaseUrl ? new GraphileJobQueue(databaseUrl) : null;
const scams = createScamModule(queue, jobStore);
const auth = createAuthModule(databaseUrl);
const garage = GarageObjectStorage.fromEnv();
const databaseHealth = createDatabaseHealthCheck(databaseUrl);

app.use("/api/privacy/*", requireSession(auth.sessionPort));
app.use("/api/provenance/*", requireSession(auth.sessionPort));
app.use("/api/captions/*", requireSession(auth.sessionPort));
app.use("/api/storage/*", requireSession(auth.sessionPort));

app.route("/", createMetricsRoutes());
app.route("/", new HealthRoutes(databaseHealth.check, databaseHealth.configured));
app.route("/", scams.routes);
app.route("/", auth.routes);
app.route("/", new PrivacyRoutes());
app.route("/", new ProvenanceRoutes());
app.route("/", new CaptionRoutes());
app.route("/", new StorageRoutes(garage));
app.route("/", new JobsRoutes(jobStore));

// Mount the real Better Auth handler only with a database. Without one the /api/auth/session
// route above stays honest and returns 503 (EXTERNAL_UNAVAILABLE).
const betterAuth = auth.auth;
if (betterAuth) app.all("/api/auth/*", (context) => betterAuth.handler(context.req.raw));

app.get("/api/openapi.json", (context) => context.json(openApiDocument));

const server = serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
});

registerGracefulShutdown(server, async () => {
    if (jobStore instanceof DatabaseJobStatusStore) await jobStore.close();
    await databaseHealth.close();
});
