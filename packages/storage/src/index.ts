export class InMemoryStorage {
    private readonly values = new Map<string, string>();

    public put(key: string, value: string): void {
        this.values.set(key, value);
    }

    public get(key: string): string | undefined {
        return this.values.get(key);
    }
}
