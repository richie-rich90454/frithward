export type WatchEntry = {
    id: string;
    label: string;
    kind: "domain" | "sender";
    createdAt: string;
    lastCheckedAt?: string;
};

const KEY = "frithward.watchlist";
const VERSION = 1;

export type WatchlistListener = (entries: WatchEntry[]) => void;

const listeners = new Set<WatchlistListener>();
let storageListening = false;

function notify(): void {
    const entries = loadWatchlist();
    for (const listener of [...listeners]) listener(entries);
}

function listenForStorage(): void {
    if (storageListening || typeof window === "undefined") return;
    window.addEventListener("storage", (event) => {
        if (event.key === KEY || event.key === null) notify();
    });
    storageListening = true;
}

/** Notifies the caller whenever the watchlist changes, including from other tabs. */
export function subscribeWatchlist(listener: WatchlistListener): () => void {
    listenForStorage();
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

interface StoredWatchlist {
    version: number;
    entries: WatchEntry[];
}

function storage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

function isWatchEntry(value: unknown): value is WatchEntry {
    if (typeof value !== "object" || value === null) return false;
    const entry = value as Record<string, unknown>;
    return (
        typeof entry["id"] === "string" &&
        entry["id"].trim().length > 0 &&
        typeof entry["label"] === "string" &&
        entry["label"].trim().length > 0 &&
        (entry["kind"] === "domain" || entry["kind"] === "sender") &&
        typeof entry["createdAt"] === "string" &&
        (entry["lastCheckedAt"] === undefined || typeof entry["lastCheckedAt"] === "string")
    );
}

export function loadWatchlist(): WatchEntry[] {
    const store = storage();
    if (!store) return [];
    try {
        const raw = store.getItem(KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return [];
        const record = parsed as Partial<StoredWatchlist>;
        if (record.version !== VERSION || !Array.isArray(record.entries)) return [];
        return record.entries.filter(isWatchEntry);
    } catch {
        return [];
    }
}

export function saveWatchlist(entries: readonly WatchEntry[]): void {
    const store = storage();
    if (!store) return;
    try {
        const payload: StoredWatchlist = {
            version: VERSION,
            entries: entries.filter(isWatchEntry),
        };
        store.setItem(KEY, JSON.stringify(payload));
        notify();
    } catch {
        // Best-effort local persistence; the caller already has the updated list.
    }
}

export function addToWatchlist(entry: WatchEntry): WatchEntry[] {
    const current = loadWatchlist();
    if (!isWatchEntry(entry)) return current;
    const duplicate = current.some(
        (item) => item.id === entry.id || item.label.toLowerCase() === entry.label.toLowerCase(),
    );
    if (duplicate) return current;
    const next = [entry, ...current];
    saveWatchlist(next);
    return next;
}

export function removeFromWatchlist(id: string): WatchEntry[] {
    const next = loadWatchlist().filter((item) => item.id !== id);
    saveWatchlist(next);
    return next;
}
