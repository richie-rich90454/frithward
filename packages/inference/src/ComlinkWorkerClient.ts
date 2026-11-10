import { wrap, type Remote } from "comlink";

export class ComlinkWorkerClient<Api> {
    private worker: Worker | null = null;
    private remote: Remote<Api> | null = null;

    public constructor(private readonly createWorker: () => Worker) {}

    public start(): void {
        if (this.worker) return;
        this.worker = this.createWorker();
        this.remote = wrap<Api>(this.worker);
    }

    public stop(): void {
        this.worker?.terminate();
        this.worker = null;
        this.remote = null;
    }

    public isRunning(): boolean {
        return this.worker !== null;
    }

    public async run<T>(
        operation: (api: Remote<Api>) => Promise<T>,
        signal?: AbortSignal,
    ): Promise<T> {
        const remote = this.remote;
        if (!remote) throw new Error("Comlink worker client is not started.");
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return new Promise<T>((resolve, reject) => {
            const onAbort = () => {
                this.stop();
                reject(new DOMException("Aborted", "AbortError"));
            };
            if (signal?.aborted) {
                onAbort();
                return;
            }
            signal?.addEventListener("abort", onAbort, { once: true });
            operation(remote).then(
                (value) => {
                    signal?.removeEventListener("abort", onAbort);
                    resolve(value);
                },
                (error: unknown) => {
                    signal?.removeEventListener("abort", onAbort);
                    reject(error);
                },
            );
        });
    }
}
