import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChartDraftStore, type ChartDraft } from "./ChartDraftStore";

const draft: ChartDraft = {
    text: "North,120\nSouth,95",
    xAxisLabel: "Region",
    yAxisLabel: "Revenue",
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

describe("ChartDraftStore", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", memoryStorage());
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("saves and loads a draft under a versioned key", () => {
        const store = new ChartDraftStore();
        store.save(draft);
        expect(store.load()).toEqual(draft);
        expect(localStorage.getItem("frithward.draft.charts")).toContain('"version":1');
    });

    it("clears a saved draft", () => {
        const store = new ChartDraftStore();
        store.save(draft);
        store.clear();
        expect(store.load()).toBeNull();
    });

    it("flushes a debounced save", () => {
        vi.useFakeTimers();
        const store = new ChartDraftStore();
        store.saveSoon(draft);
        store.saveSoon({ ...draft, xAxisLabel: "Area" });
        vi.advanceTimersByTime(300);
        expect(store.load()?.xAxisLabel).toBe("Area");
    });

    it("ignores malformed and version-mismatched data", () => {
        localStorage.setItem("frithward.draft.charts", "not json");
        expect(new ChartDraftStore().load()).toBeNull();
        localStorage.setItem(
            "frithward.draft.charts",
            JSON.stringify({ version: 99, text: "old" }),
        );
        expect(new ChartDraftStore().load()).toBeNull();
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
        const store = new ChartDraftStore();
        expect(() => store.save(draft)).not.toThrow();
        expect(store.load()).toBeNull();
        expect(() => store.clear()).not.toThrow();
    });
});
