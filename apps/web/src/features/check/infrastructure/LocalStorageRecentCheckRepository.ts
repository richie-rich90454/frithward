export interface RecentCheckStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface RecentCheckFinding {
    id: string;
    label: string;
    detail: string;
    severity: "low" | "medium" | "high";
}

export type RecentCheckChannel = "message" | "url" | "qr";

export interface RecentCheck {
    id: string;
    createdAt: string;
    channel: RecentCheckChannel;
    input: string;
    summary: string;
    findings: readonly RecentCheckFinding[];
    limitations: readonly string[];
}

export interface RecentCheckRepository {
    list(): readonly RecentCheck[];
    save(entry: RecentCheck): void;
}

const KEY = "frithward.recent-checks";
const MAX_ENTRIES = 20;

function isRecentCheck(value: unknown): value is RecentCheck {
    if (typeof value !== "object" || value === null) return false;
    const entry = value as Record<string, unknown>;
    return (
        typeof entry["id"] === "string" &&
        typeof entry["createdAt"] === "string" &&
        (entry["channel"] === "message" ||
            entry["channel"] === "url" ||
            entry["channel"] === "qr") &&
        typeof entry["input"] === "string" &&
        typeof entry["summary"] === "string" &&
        Array.isArray(entry["findings"]) &&
        Array.isArray(entry["limitations"])
    );
}

function defaultStorage(): RecentCheckStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

/** Best-effort local history: storage failures keep only the in-memory copy. */
export class LocalStorageRecentCheckRepository implements RecentCheckRepository {
    private readonly fallback: RecentCheck[] = [];

    public constructor(private readonly storage: RecentCheckStorage | null = defaultStorage()) {}

    public list(): readonly RecentCheck[] {
        if (!this.storage) return [...this.fallback];
        try {
            const raw = this.storage.getItem(KEY);
            if (!raw) return [];
            const parsed: unknown = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(isRecentCheck).slice(0, MAX_ENTRIES) : [];
        } catch {
            return [];
        }
    }

    public save(entry: RecentCheck): void {
        const next = [entry, ...this.list()].slice(0, MAX_ENTRIES);
        this.fallback.length = 0;
        this.fallback.push(...next);
        if (!this.storage) return;
        try {
            this.storage.setItem(KEY, JSON.stringify(next));
        } catch {
            // The in-memory copy above keeps the current session usable.
        }
    }
}
