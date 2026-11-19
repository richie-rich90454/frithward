import { describe, expect, it, vi } from "vitest";
import { expose } from "comlink";
import { WorkerClient } from "./index.js";

interface TestApi {
    add(a: number, b: number): Promise<number>;
}

function createFakeWorker(api: TestApi): { factory: () => Worker; terminate: ReturnType<typeof vi.fn> } {
    const terminate = vi.fn();
    const factory = (): Worker => {
        const { port1, port2 } = new MessageChannel();
        expose(api, port2);
        const worker = port1 as unknown as Worker;
        Object.defineProperty(worker, "terminate", {
            value: () => {
                terminate();
                port1.close();
                port2.close();
            },
        });
        return worker;
    };
    return { factory, terminate };
}

describe("WorkerClient", () => {
    it("awaits a real task result from a Comlink-wrapped worker", async () => {
        const { factory } = createFakeWorker({ add: async (a, b) => a + b });
        const client = new WorkerClient<TestApi>(factory);

        const result = await client.run(async (api) => api.add(2, 3));

        expect(result).toBe(5);
        expect(client.isRunning()).toBe(true);
        client.stop();
    });

    it("throws a clear error when no Worker factory is provided", () => {
        expect(() => new WorkerClient()).toThrow("requires a Worker factory");
    });

    it("terminates the worker on stop", async () => {
        const { factory, terminate } = createFakeWorker({ add: async (a, b) => a + b });
        const client = new WorkerClient<TestApi>(factory);
        await client.run(async (api) => api.add(1, 1));

        client.stop();

        expect(terminate).toHaveBeenCalledOnce();
        expect(client.isRunning()).toBe(false);
    });

    it("rejects concurrent runs", async () => {
        const { factory } = createFakeWorker({ add: async (a, b) => a + b });
        const client = new WorkerClient<TestApi>(factory);
        const first = client.run(async (api) => api.add(1, 2));

        await expect(client.run(async (api) => api.add(3, 4))).rejects.toThrow("already running");
        await first;
        client.stop();
    });
});
