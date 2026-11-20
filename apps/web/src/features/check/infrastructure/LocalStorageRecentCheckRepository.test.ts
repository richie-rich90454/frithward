import { describe, expect, it } from "vitest";
import {
    LocalStorageRecentCheckRepository,
    type RecentCheck,
    type RecentCheckStorage,
} from "./LocalStorageRecentCheckRepository";

const KEY = "frithward.recent-checks";

function createStorage(): RecentCheckStorage & { read: (key: string) => string | null } {
    const values = new Map<string, string>();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
            values.set(key, value);
        },
        read: (key) => values.get(key) ?? null,
    };
}

function entry(id: string): RecentCheck {
    return {
        id,
        createdAt: "2026-01-01T00:00:00.000Z",
        channel: "message",
        input: "hello",
        summary: "No text risk indicators found.",
        findings: [],
        limitations: ["Text patterns alone cannot prove intent."],
    };
}

describe("LocalStorageRecentCheckRepository", () => {
    it("persists recent checks newest first and survives a reload", () => {
        const storage = createStorage();
        const repository = new LocalStorageRecentCheckRepository(storage);
        repository.save(entry("first"));
        repository.save(entry("second"));

        const reloaded = new LocalStorageRecentCheckRepository(storage);
        expect(reloaded.list().map((item) => item.id)).toEqual(["second", "first"]);
        expect(JSON.parse(storage.read(KEY) ?? "[]")).toHaveLength(2);
    });

    it("ignores malformed stored data instead of returning fabricated checks", () => {
        const storage = createStorage();
        storage.setItem(KEY, JSON.stringify([{ id: "good", broken: true }, { id: "bad" }]));
        expect(new LocalStorageRecentCheckRepository(storage).list()).toEqual([]);

        storage.setItem(KEY, "{not json");
        expect(new LocalStorageRecentCheckRepository(storage).list()).toEqual([]);
    });

    it("works without localStorage", () => {
        const repository = new LocalStorageRecentCheckRepository(null);
        repository.save(entry("memory"));
        expect(repository.list().map((item) => item.id)).toEqual(["memory"]);
    });
});
