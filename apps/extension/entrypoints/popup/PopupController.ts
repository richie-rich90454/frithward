import { browser } from "wxt/browser";
import { analyze, type AnalysisResult, type Severity } from "../../analysis";
import {
    addRecentCheck,
    clearRecentChecks,
    loadRecentChecks,
    type RecentCheck,
} from "../../history";

export interface PageInfo {
    url: string;
    text: string;
    textLength: number;
    source: "page" | "selection";
    analysis: AnalysisResult | null;
    error: string | null;
}

function errorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}

const SEVERITY_RANK: Record<Severity | "none", number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
};

export class PopupController {
    private readonly listeners = new Set<() => void>();
    private info: PageInfo | null = null;
    private recent: RecentCheck[] = [];
    private busy = false;

    public constructor() {
        void loadRecentChecks().then((checks) => {
            if (this.info !== null) return; // a check already populated history
            this.recent = checks;
            this.notify();
        });
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getInfo(): PageInfo | null {
        return this.info;
    }

    public getRecentChecks(): readonly RecentCheck[] {
        return this.recent;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public checkPage(): Promise<void> {
        return this.run("frithward:check-page", "page");
    }

    public checkSelection(): Promise<void> {
        return this.run("frithward:check-selection", "selection");
    }

    public async clearHistory(): Promise<void> {
        this.recent = await clearRecentChecks();
        this.notify();
    }

    private async run(
        type: "frithward:check-page" | "frithward:check-selection",
        source: PageInfo["source"],
    ): Promise<void> {
        this.busy = true;
        this.info = null;
        this.notify();
        try {
            const response = await browser.runtime.sendMessage({ type });
            const captured = this.parse(response, source);
            this.info = captured;
            if (captured.error === null) await this.record(captured);
        } catch (cause) {
            this.info = {
                url: "",
                text: "",
                textLength: 0,
                source,
                analysis: null,
                error: `Unable to check the page: ${errorMessage(cause)}`,
            };
        } finally {
            this.busy = false;
            this.notify();
        }
    }

    private parse(response: unknown, source: PageInfo["source"]): PageInfo {
        if (typeof response !== "object" || response === null) {
            return this.failure("The page returned no readable data.", source);
        }
        const record = response as { url?: unknown; text?: unknown; error?: unknown };
        if (typeof record.error === "string" && record.error !== "") {
            return this.failure(record.error, source);
        }
        const url = typeof record.url === "string" ? record.url : "";
        const text = typeof record.text === "string" ? record.text : "";
        if (source === "selection" && text.trim() === "") {
            return this.failure("No text is selected on this page.", source);
        }
        return {
            url,
            text,
            textLength: text.length,
            source,
            analysis: analyze(text, url),
            error: null,
        };
    }

    private failure(error: string, source: PageInfo["source"]): PageInfo {
        return { url: "", text: "", textLength: 0, source, analysis: null, error };
    }

    private async record(info: PageInfo): Promise<void> {
        const findings = info.analysis?.findings ?? [];
        const topSeverity = findings.reduce<Severity | "none">(
            (best, finding) =>
                SEVERITY_RANK[finding.severity] > SEVERITY_RANK[best] ? finding.severity : best,
            "none",
        );
        const entry: RecentCheck = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: new Date().toISOString(),
            source: info.source,
            url: info.url,
            textLength: info.textLength,
            summary: info.analysis?.summary ?? "",
            findingCount: findings.length,
            topSeverity,
        };
        this.recent = await addRecentCheck(entry);
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
