import { serve } from "@hono/node-server";
import { createApp, reports } from "./app.js";

const server = serve({
    fetch: createApp().fetch,
    port: Number(process.env.PORT ?? 3004),
});

let closing = false;
const shutdown = () => {
    if (closing) return;
    closing = true;
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    server.close(async () => {
        try {
            await reports.close();
        } finally {
            clearTimeout(forceExit);
            process.exit(0);
        }
    });
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
