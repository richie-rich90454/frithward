export class AppConfiguration {
    public readonly baseUrl: string;
    public readonly executionLocation: string;

    public constructor(input: { baseUrl: string; executionLocation?: string }) {
        if (input.baseUrl.trim().length === 0) throw new Error("Base URL required.");
        this.baseUrl = input.baseUrl;
        this.executionLocation = input.executionLocation ?? "browser";
    }
}
