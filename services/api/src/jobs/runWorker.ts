import { run, type TaskList } from "graphile-worker";
import { AnalyzeJobHandler } from "./AnalyzeJobHandler.js";
import { sharedJobStore } from "./jobStore.js";

const tasks: TaskList = {
    "analyze-message": async (payload, helpers) => {
        const handler = new AnalyzeJobHandler(undefined, sharedJobStore);
        await handler.handle({
            jobId: helpers.job.id,
            payload: payload as Record<string, string>,
        });
    },
};

export async function runWorker(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required to run the worker.");

    const runner = await run({ connectionString }, tasks);
    let stopping = false;
    const shutdown = async (): Promise<void> => {
        if (stopping) return;
        stopping = true;
        await runner.stop();
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
