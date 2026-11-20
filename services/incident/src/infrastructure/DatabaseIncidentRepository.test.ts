import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
    createIncidentRepository,
    DatabaseIncidentRepository,
} from "./DatabaseIncidentRepository.js";
import { InMemoryIncidentRepository } from "./InMemoryIncidentRepository.js";

describe("DatabaseIncidentRepository", () => {
    it("falls back to memory without DATABASE_URL", async () => {
        const handle = createIncidentRepository(undefined);
        expect(handle.repository).toBeInstanceOf(InMemoryIncidentRepository);
        expect(createIncidentRepository("  ").repository).toBeInstanceOf(
            InMemoryIncidentRepository,
        );
        await expect(handle.close()).resolves.toBeUndefined();
    });

    it("inserts with parameters and maps fetched rows", async () => {
        const row = {
            id: "i1",
            title: "Phishing",
            severity: "high" as const,
            details: "details",
            status: "open" as const,
            created_at: new Date("2026-01-01T00:00:00.000Z"),
        };
        const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({ rows: [row] }));
        const close = vi.fn(async () => {});
        const repository = new DatabaseIncidentRepository({
            query,
            end: close,
        } as unknown as Pool);

        await repository.save({
            ...row,
            createdAt: "2026-01-01T00:00:00.000Z",
        });
        expect(query.mock.calls[0]?.[1]).toEqual([
            "i1",
            "Phishing",
            "high",
            "details",
            "open",
            "2026-01-01T00:00:00.000Z",
        ]);

        expect(await repository.find("i1")).toEqual({
            id: "i1",
            title: "Phishing",
            severity: "high",
            details: "details",
            status: "open",
            createdAt: "2026-01-01T00:00:00.000Z",
        });
        await repository.close();
        expect(close).toHaveBeenCalledOnce();
    });

    it("returns null when no row is found", async () => {
        const repository = new DatabaseIncidentRepository({
            query: async () => ({ rows: [] }),
            end: async () => {},
        } as unknown as Pool);
        expect(await repository.find("missing")).toBeNull();
    });
});
