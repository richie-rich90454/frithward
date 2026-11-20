import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentDraftStore, type DocumentDraft } from "./DocumentDraftStore";

const draft: DocumentDraft = {
    title: "Quarterly report",
    sectionsText: "## Summary\nRevenue grew.",
    sheetText: "Region,Revenue\nNorth,120",
    slidesText: "# Overview\n- First point",
};

function memoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
        removeItem: (key: string) => {
            values.delete(key);
        },
    };
}

describe("DocumentDraftStore", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", memoryStorage());
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("saves and loads a draft under a versioned key", () => {
        const store = new DocumentDraftStore();
        store.save(draft);
        expect(store.load()).toEqual(draft);
        expect(localStorage.getItem("frithward.draft.documents")).toContain('"version":1');
    });

    it("clears a saved draft", () => {
        const store = new DocumentDraftStore();
        store.save(draft);
        store.clear();
        expect(store.load()).toBeNull();
    });

    it("flushes a debounced save", () => {
        vi.useFakeTimers();
        const store = new DocumentDraftStore();
        store.saveSoon(draft);
        store.saveSoon({ ...draft, title: "New title" });
        vi.advanceTimersByTime(300);
        expect(store.load()?.title).toBe("New title");
    });

    it("ignores malformed and version-mismatched data", () => {
        localStorage.setItem("frithward.draft.documents", "not json");
        expect(new DocumentDraftStore().load()).toBeNull();
        localStorage.setItem(
            "frithward.draft.documents",
            JSON.stringify({ version: 99, title: "old" }),
        );
        expect(new DocumentDraftStore().load()).toBeNull();
    });

    it("does not throw when storage is unavailable", () => {
        const blocked = {
            getItem: () => {
                throw new Error("blocked");
            },
            setItem: () => {
                throw new Error("blocked");
            },
            removeItem: () => {
                throw new Error("blocked");
            },
        };
        vi.stubGlobal("localStorage", blocked);
        const store = new DocumentDraftStore();
        expect(() => store.save(draft)).not.toThrow();
        expect(store.load()).toBeNull();
        expect(() => store.clear()).not.toThrow();
    });
});
