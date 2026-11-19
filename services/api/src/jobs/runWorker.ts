import { run } from "graphile-worker";
import { AnalyzeJobHandler } from "./AnalyzeJobHandler.js";
import { DatabaseJobStatusStore } from "./DatabaseJobStatusStore.js";
export async function runWorker(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required to run the worker.");
    const store = new DatabaseJobStatusStore(connectionString);

    const runner = await run(
        { connectionString },
        {
            "analyze-message": async (payload, helpers) => {
                const handler = new AnalyzeJobHandler(undefined, store);
                await handler.handle({
                    jobId: helpers.job.id,
                    payload: payload as Record<string, string>,
                });
            },
        },
    );
    let stopping = false;
    const shutdown = async (): Promise<void> => {
        if (stopping) return;
        stopping = true;
        await runner.stop();
        await store.close();
        process.exit(0);
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
    // The runner keeps the event loop alive; do not stop it here.
}

if (import.meta.main) {
    runWorker().catch((cause: unknown) => {
        console.error("Failed to start worker:", cause);
        process.exit(1);
    });
}
