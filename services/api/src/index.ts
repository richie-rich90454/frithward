import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createScamModule } from "./modules/scam-analysis/composition/createScamAnalysisModule.js";

const app = new Hono();
const scams = createScamModule();

app.route("/api/scam", scams.routes);
app.get("/health", (context) => context.json({ status: "ok" }));

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
});
