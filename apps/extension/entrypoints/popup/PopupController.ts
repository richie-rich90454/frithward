import { browser } from "wxt/browser";

export interface PageInfo {
    url: string;
    textLength: number;
    error: string | null;
}

function errorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

export class PopupController {
    private readonly listeners = new Set<() => void>();
    private info: PageInfo | null = null;
    private busy = false;

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getInfo(): PageInfo | null {
        return this.info;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public async checkPage(): Promise<void> {
        this.busy = true;
        this.info = null;
        this.notify();
        try {
            const response = (await browser.runtime.sendMessage({
                type: "frithward:check-page",
            })) as unknown;
            this.info = this.parse(response);
        } catch (cause) {
            this.info = { url: "", textLength: 0, error: `Unable to check the page: ${errorMessage(cause)}` };
        } finally {
            this.busy = false;
            this.notify();
        }
    }

    private parse(response: unknown): PageInfo {
        if (typeof response !== "object" || response === null) {
            return { url: "", textLength: 0, error: "The page returned no readable data." };
        }
        const record = response as { url?: unknown; text?: unknown; error?: unknown };
        if (typeof record.error === "string" && record.error !== "") {
            return { url: "", textLength: 0, error: record.error };
        }
        return {
            url: typeof record.url === "string" ? record.url : "",
            textLength: typeof record.text === "string" ? record.text.length : 0,
            error: null,
        };
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
