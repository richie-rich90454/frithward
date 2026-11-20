import { afterEach, describe, expect, it, vi } from "vitest";
import {
    addToWatchlist,
    loadWatchlist,
    removeFromWatchlist,
    saveWatchlist,
    subscribeWatchlist,
    type WatchEntry,
} from "./WatchlistStore.js";

const KEY = "frithward.watchlist";

function stubStorage(): Map<string, string> {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    });
    return values;
}

function entry(id: string, label = "example.test"): WatchEntry {
    return { id, label, kind: "domain", createdAt: "2026-01-01T00:00:00.000Z" };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("WatchlistStore", () => {
    it("round-trips entries through versioned storage", () => {
        const values = stubStorage();
        saveWatchlist([
            entry("one"),
            { ...entry("two"), kind: "sender", lastCheckedAt: "2026-01-02T00:00:00.000Z" },
        ]);
        expect(loadWatchlist().map((item) => item.id)).toEqual(["one", "two"]);
        expect(JSON.parse(values.get(KEY) ?? "{}").version).toBe(1);
    });

    it("ignores malformed data and wrong versions", () => {
        const values = stubStorage();
        values.set(KEY, "{not json");
        expect(loadWatchlist()).toEqual([]);
        values.set(KEY, JSON.stringify({ version: 99, entries: [entry("old")] }));
        expect(loadWatchlist()).toEqual([]);
        values.set(KEY, JSON.stringify({ version: 1, entries: [entry("good"), { id: "bad" }] }));
        expect(loadWatchlist().map((item) => item.id)).toEqual(["good"]);
    });

    it("adds without duplicates and removes by id", () => {
        stubStorage();
        expect(addToWatchlist(entry("one"))).toHaveLength(1);
        expect(addToWatchlist(entry("one"))).toHaveLength(1);
        expect(addToWatchlist(entry("two", "EXAMPLE.test"))).toHaveLength(1);
        expect(addToWatchlist(entry("three", "another.test")).map((item) => item.id)).toEqual([
            "three",
            "one",
        ]);
        expect(removeFromWatchlist("one").map((item) => item.id)).toEqual(["three"]);
    });

    it("stays safe without localStorage", () => {
        vi.stubGlobal("localStorage", undefined);
        expect(loadWatchlist()).toEqual([]);
        expect(addToWatchlist(entry("memory")).map((item) => item.id)).toEqual(["memory"]);
        expect(removeFromWatchlist("memory")).toEqual([]);
    });

    it("notifies local subscribers when an entry is added elsewhere", () => {
        stubStorage();
        const received: WatchEntry[][] = [];
        const unsubscribe = subscribeWatchlist((entries) => received.push(entries));
        addToWatchlist(entry("notified"));
        expect(received).toHaveLength(1);
        expect(received[0]?.map((item) => item.id)).toEqual(["notified"]);
        unsubscribe();
        addToWatchlist(entry("ignored"));
        expect(received).toHaveLength(1);
    });

    it("notifies subscribers when another tab changes storage", () => {
        const values = stubStorage();
        let onStorage: ((event: { key: string | null }) => void) | undefined;
        vi.stubGlobal("window", {
            addEventListener: (type: string, listener: (event: { key: string | null }) => void) => {
                if (type === "storage") onStorage = listener;
            },
        });
        values.set(KEY, JSON.stringify({ version: 1, entries: [entry("remote")] }));
        const received: WatchEntry[][] = [];
        const unsubscribe = subscribeWatchlist((entries) => received.push(entries));
        onStorage?.({ key: KEY });
        expect(received.at(-1)?.map((item) => item.id)).toEqual(["remote"]);
        unsubscribe();
    });
});
