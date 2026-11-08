import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();
app.get("/health", (context) => context.json({ status: "ok", service: "community" }));

serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3004),
});
