import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const server = serve({
    fetch: createApp().fetch,
    port: Number(process.env.PORT ?? 3003),
});

let closing = false;
const shutdown = () => {
    if (closing) return;
    closing = true;
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    server.close(() => {
        clearTimeout(forceExit);
        process.exit(0);
    });
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
