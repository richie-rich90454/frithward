export class WorkerClient {
    private running = false;

    public async run(): Promise<void> {
        if (this.running) throw new Error("Worker is already running.");
        this.running = true;
    }

    public stop(): void {
        this.running = false;
    }
}
