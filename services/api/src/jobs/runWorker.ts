import { makeWorker } from "graphile-worker";

const connectionString =
    process.env.DATABASE_URL ?? "postgres://frithward:frithward@localhost:5432/frithward";

export async function runWorker(): Promise<void> {
    const worker = await makeWorker(
        { connectionString },
        [],
        {
            queues: ["frithward"]
        }
    );
    await worker.release();
}
