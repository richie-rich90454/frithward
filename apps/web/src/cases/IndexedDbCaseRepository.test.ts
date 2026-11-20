import { Case as CaseSchema, type Case } from "@frithward/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createCaseId,
    InMemoryCaseRepository,
    IndexedDbCaseRepository,
    normalizeCase,
} from "./IndexedDbCaseRepository.js";
import { relativeTime } from "./relativeTime.js";

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-02T00:00:00.000Z";
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function makeCase(id: string, title: string, updatedAt: string): Case {
    return normalizeCase({ id, kind: "message", title, inputs: { text: title } }, updatedAt);
}

describe("case record helpers", () => {
    it("generates schema-valid ids", () => {
        expect(CaseSchema.shape.id.safeParse(createCaseId()).success).toBe(true);
    });

    it("stamps missing fields and validates at the boundary", () => {
        const record = normalizeCase(
            { kind: "url", title: "Check", inputs: { url: "https://example.com" } },
            NOW,
        );
        expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(record.createdAt).toBe(NOW);
        expect(record.updatedAt).toBe(NOW);
        expect(record.findings).toEqual([]);
        expect(record.artifacts).toEqual([]);
        expect(record.nextSteps).toEqual([]);
        expect(record.limitations).toEqual([]);
        expect(record.status).toBe("draft");
        expect(() =>
            normalizeCase(
                {
                    // @ts-expect-error intentionally invalid kind
                    kind: "nope",
                    title: "Bad",
                    inputs: {},
                },
                NOW,
            ),
        ).toThrow();
    });
});

describe("InMemoryCaseRepository", () => {
    it("round-trips cases and lists newest first", async () => {
        const repository = new InMemoryCaseRepository();
        await repository.save(makeCase(ID_A, "Older", NOW));
        await repository.save(makeCase(ID_B, "Newer", LATER));

        const listed = await repository.list();
        expect(listed.map((record) => record.id)).toEqual([ID_B, ID_A]);
        expect((await repository.get(ID_A))?.title).toBe("Older");
        expect(await repository.get("missing")).toBeNull();
    });

    it("removes and clears records", async () => {
        const repository = new InMemoryCaseRepository();
        await repository.save(makeCase(ID_A, "One", NOW));
        await repository.save(makeCase(ID_B, "Two", LATER));
        await repository.remove(ID_A);
        expect(await repository.get(ID_A)).toBeNull();
        await repository.clear();
        expect(await repository.list()).toEqual([]);
    });
});

describe("IndexedDbCaseRepository", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("surfaces a clear error when IndexedDB is unavailable", async () => {
        vi.stubGlobal("indexedDB", undefined);
        const repository = new IndexedDbCaseRepository();
        await expect(repository.list()).rejects.toThrow(/IndexedDB is not available/);
    });
});

describe("relativeTime", () => {
    it("formats recent and older timestamps", () => {
        const now = new Date(NOW).getTime();
        expect(relativeTime(NOW, now)).toBe("just now");
        expect(relativeTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe("5 min ago");
        expect(relativeTime(new Date(now - 2 * 3_600_000).toISOString(), now)).toBe("2 h ago");
        expect(relativeTime(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe("2 d ago");
        expect(relativeTime("not a date", now)).toBe("unknown time");
    });
});
