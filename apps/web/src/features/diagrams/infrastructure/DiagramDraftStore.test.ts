import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiagramDraftStore, type DiagramDraft } from "./DiagramDraftStore";

const draft: DiagramDraft = { source: "flowchart TD\n  A[Start] --> B[Stop]" };

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

describe("DiagramDraftStore", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", memoryStorage());
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("saves and loads a draft under a versioned key", () => {
        const store = new DiagramDraftStore();
        store.save(draft);
        expect(store.load()).toEqual(draft);
        expect(localStorage.getItem("frithward.draft.diagrams")).toContain('"version":1');
    });

    it("clears a saved draft", () => {
        const store = new DiagramDraftStore();
        store.save(draft);
        store.clear();
        expect(store.load()).toBeNull();
    });

    it("flushes a debounced save", () => {
        vi.useFakeTimers();
        const store = new DiagramDraftStore();
        store.saveSoon(draft);
        store.saveSoon({ source: "graph LR\n A --> B" });
        vi.advanceTimersByTime(300);
        expect(store.load()?.source).toBe("graph LR\n A --> B");
    });

    it("ignores malformed and version-mismatched data", () => {
        localStorage.setItem("frithward.draft.diagrams", "not json");
        expect(new DiagramDraftStore().load()).toBeNull();
        localStorage.setItem(
            "frithward.draft.diagrams",
            JSON.stringify({ version: 99, source: "old" }),
        );
        expect(new DiagramDraftStore().load()).toBeNull();
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
        const store = new DiagramDraftStore();
        expect(() => store.save(draft)).not.toThrow();
        expect(store.load()).toBeNull();
        expect(() => store.clear()).not.toThrow();
    });
});
