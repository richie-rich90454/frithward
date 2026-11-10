import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createScamModule } from "./modules/scam-analysis/composition/createScamAnalysisModule.js";
import { createAuthModule } from "./modules/auth/composition/createAuthModule.js";
import { HealthRoutes } from "./modules/health/HealthRoutes.js";
import { PrivacyRoutes } from "./modules/privacy/PrivacyRoutes.js";
import { ProvenanceRoutes } from "./modules/provenance/ProvenanceRoutes.js";
import { CaptionRoutes } from "./modules/captions/CaptionRoutes.js";
import { JobsRoutes } from "./modules/jobs/JobsRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireSession } from "./middleware/requireSession.js";
import { GraphileJobQueue } from "./jobs/queue.js";
import { InMemoryJobStatusStore } from "./jobs/jobStore.js";
import { openApiDocument } from "./openapi.js";

const databaseUrl =
    process.env.DATABASE_URL ?? "postgres://frithward:frithward@localhost:5432/frithward";

const app = new Hono();
app.onError(errorHandler);

const jobStore = new InMemoryJobStatusStore();
const scams = createScamModule(new GraphileJobQueue(databaseUrl), jobStore);
const auth = createAuthModule(databaseUrl);

app.use("/api/privacy/*", requireSession(auth.sessionPort));
app.use("/api/provenance/*", requireSession(auth.sessionPort));
app.use("/api/captions/*", requireSession(auth.sessionPort));

app.route("/", new HealthRoutes());
app.route("/", scams.routes);
app.route("/", auth.routes);
app.route("/", new PrivacyRoutes());
app.route("/", new ProvenanceRoutes());
app.route("/", new CaptionRoutes());
app.route("/", new JobsRoutes(jobStore));

app.get("/api/openapi.json", (context) => context.json(openApiDocument));

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
});
