import { run } from "graphile-worker";

const connectionString =
    process.env.DATABASE_URL ?? "postgres://frithward:frithward@localhost:5432/frithward";

export async function runWorker(): Promise<void> {
    const runner = await run(
        {
            connectionString: connectionString
        },
        {}
    );
    await runner.stop();
}
