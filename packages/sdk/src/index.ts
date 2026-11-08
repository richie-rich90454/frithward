export class FrithwardClient {
    public constructor(private readonly baseUrl: string) {
        if (baseUrl.trim().length === 0) throw new Error("Base URL required.");
    }

    public endpoint(path: string): string {
        return `${this.baseUrl.replace(/\/$/, "")}${path}`;
    }
}
