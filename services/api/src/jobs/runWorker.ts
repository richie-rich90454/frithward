import { run, type TaskList } from "graphile-worker";
import { AnalyzeJobHandler } from "./AnalyzeJobHandler.js";

const connectionString =
    process.env.DATABASE_URL ?? "postgres://frithward:frithward@localhost:5432/frithward";

const tasks: TaskList = {
    "analyze-message": async (payload, helpers) => {
        const handler = new AnalyzeJobHandler();
        await handler.handle({
            jobId: helpers.job.id,
            payload: payload as Record<string, string>,
        });
    },
};

export async function runWorker(): Promise<void> {
    const runner = await run({ connectionString }, tasks);
    await runner.stop();
}
