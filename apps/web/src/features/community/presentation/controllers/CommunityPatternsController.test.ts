import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    COMMUNITY_PATTERNS_KEY,
    CommunityPatternsController,
    validatePatternInput,
} from "./CommunityPatternsController";

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

const valid = {
    title: "Unexpected invoice",
    description: "A message asked for payment via a new bank account.",
    sourceUrl: "https://example.org/notes",
};

describe("validatePatternInput", () => {
    it("accepts a trimmed entry with an optional source URL", () => {
        expect(validatePatternInput(valid)).toBeNull();
        expect(validatePatternInput({ title: " A ", description: " B " })).toBeNull();
    });

    it("rejects empty title and description", () => {
        expect(validatePatternInput({ ...valid, title: "  " })).toContain("title");
        expect(validatePatternInput({ ...valid, description: " " })).toContain("description");
    });

    it("enforces length caps", () => {
        expect(validatePatternInput({ ...valid, title: "x".repeat(121) })).toContain("120");
        expect(validatePatternInput({ ...valid, description: "x".repeat(601) })).toContain("600");
        expect(validatePatternInput({ ...valid, sourceUrl: "x".repeat(501) })).toContain("500");
    });
});

describe("CommunityPatternsController", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", memoryStorage());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("starts empty and stores added patterns under the local key", () => {
        const controller = new CommunityPatternsController();
        expect(controller.getState()).toEqual({ patterns: [], error: null });
        expect(controller.add(valid)).toBe(true);
        expect(controller.getState().patterns).toHaveLength(1);
        expect(controller.getState().patterns[0]).toMatchObject({
            title: valid.title,
            description: valid.description,
            sourceUrl: valid.sourceUrl,
        });
        expect(localStorage.getItem(COMMUNITY_PATTERNS_KEY)).toContain('"version":1');
    });

    it("loads patterns added earlier and removes them", () => {
        new CommunityPatternsController().add(valid);
        const reloaded = new CommunityPatternsController();
        const id = reloaded.getState().patterns[0]?.id;
        expect(id).toBeDefined();
        reloaded.remove(id ?? "");
        expect(reloaded.getState().patterns).toHaveLength(0);
        expect(new CommunityPatternsController().getState().patterns).toHaveLength(0);
    });

    it("reports invalid input without storing it", () => {
        const controller = new CommunityPatternsController();
        expect(controller.add({ title: "", description: "detail" })).toBe(false);
        expect(controller.getState().error).toContain("title");
        expect(controller.getState().patterns).toHaveLength(0);
        expect(localStorage.getItem(COMMUNITY_PATTERNS_KEY)).toBeNull();
    });

    it("ignores malformed and version-mismatched stored data", () => {
        localStorage.setItem(COMMUNITY_PATTERNS_KEY, "not json");
        expect(new CommunityPatternsController().getState().patterns).toEqual([]);
        localStorage.setItem(
            COMMUNITY_PATTERNS_KEY,
            JSON.stringify({ version: 99, patterns: [valid] }),
        );
        expect(new CommunityPatternsController().getState().patterns).toEqual([]);
    });

    it("filters invalid entries from otherwise valid stored data", () => {
        const stored = { ...valid, id: "p1", createdAt: "2026-01-01T00:00:00.000Z" };
        localStorage.setItem(
            COMMUNITY_PATTERNS_KEY,
            JSON.stringify({
                version: 1,
                patterns: [stored, { id: "x", title: "", description: "d" }, null],
            }),
        );
        const patterns = new CommunityPatternsController().getState().patterns;
        expect(patterns).toHaveLength(1);
        expect(patterns[0]?.title).toBe(valid.title);
    });

    it("works without localStorage", () => {
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
        const controller = new CommunityPatternsController();
        expect(controller.getState().patterns).toEqual([]);
        expect(() => controller.add(valid)).not.toThrow();
        expect(() => controller.remove("id")).not.toThrow();
    });
});
