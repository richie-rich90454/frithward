const STORAGE_KEY = "frithward.draft.charts";
const VERSION = 1;
const DEBOUNCE_MS = 300;

export interface ChartDraft {
    text: string;
    xAxisLabel: string;
    yAxisLabel: string;
}

/** Best-effort local draft persistence; storage can be blocked or full. */
export class ChartDraftStore {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private pending: ChartDraft | null = null;

    public load(): ChartDraft | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw === null) return null;
            const parsed: unknown = JSON.parse(raw);
            if (typeof parsed !== "object" || parsed === null) return null;
            const candidate = parsed as Partial<ChartDraft> & { version?: unknown };
            if (candidate.version !== VERSION) return null;
            return {
                text: typeof candidate.text === "string" ? candidate.text : "",
                xAxisLabel: typeof candidate.xAxisLabel === "string" ? candidate.xAxisLabel : "",
                yAxisLabel: typeof candidate.yAxisLabel === "string" ? candidate.yAxisLabel : "",
            };
        } catch {
            return null;
        }
    }

    public save(draft: ChartDraft): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...draft }));
        } catch {
            // Ignored: drafts are a convenience, not a guarantee.
        }
    }

    public saveSoon(draft: ChartDraft): void {
        this.pending = draft;
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.flush(), DEBOUNCE_MS);
    }

    public flush(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.pending !== null) {
            this.save(this.pending);
            this.pending = null;
        }
    }

    public clear(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.pending = null;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignored: nothing to clear when storage is unavailable.
        }
    }
}
