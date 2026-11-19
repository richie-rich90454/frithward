import { wrap, type Remote } from "comlink";

export type WorkerFactory = () => Worker;

export class WorkerClient<Api extends object> {
    private readonly createWorker: WorkerFactory;
    private worker: Worker | null = null;
    private remote: Remote<Api> | null = null;
    private running = false;

    public constructor(createWorker?: WorkerFactory) {
        if (!createWorker) {
            throw new Error("WorkerClient requires a Worker factory to create workers.");
        }
        this.createWorker = createWorker;
    }

    public start(): void {
        if (this.worker) return;
        this.worker = this.createWorker();
        this.remote = wrap<Api>(this.worker);
    }

    public isRunning(): boolean {
        return this.worker !== null;
    }

    public async run<Result>(
        task: (api: Remote<Api>) => Promise<Result> | Result,
    ): Promise<Result> {
        this.start();
        if (this.running) throw new Error("Worker is already running.");
        const remote = this.remote as Remote<Api>;
        this.running = true;
        try {
            return await task(remote);
        } finally {
            this.running = false;
        }
    }

    public stop(): void {
        this.worker?.terminate();
        this.worker = null;
        this.remote = null;
        this.running = false;
    }
}
