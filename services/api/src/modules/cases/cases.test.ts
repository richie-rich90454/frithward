import { randomUUID } from "node:crypto";
import type { Case, CreateCaseInput, UpdateCaseInput } from "@frithward/contracts";
import type { Pool } from "pg";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errorHandler.js";
import { CaseRoutes } from "./CaseRoutes.js";
import type { CaseStore } from "./CaseStore.js";
import { createCaseStore, DatabaseCaseStore } from "./DatabaseCaseStore.js";

class FakeCaseStore implements CaseStore {
    public readonly records = new Map<string, Case>();

    public async create(input: CreateCaseInput): Promise<Case> {
        const now = "2026-01-01T00:00:00.000Z";
        const record: Case = {
            id: randomUUID(),
            kind: input.kind,
            createdAt: now,
            updatedAt: now,
            title: input.title,
            inputs: input.inputs,
            findings: input.findings ?? [],
            artifacts: input.artifacts ?? [],
            nextSteps: input.nextSteps ?? [],
            limitations: input.limitations ?? [],
            status: input.status ?? "draft",
        };
        this.records.set(record.id, record);
        return record;
    }

    public async get(id: string): Promise<Case | null> {
        return this.records.get(id) ?? null;
    }

    public async list(): Promise<readonly Case[]> {
        return [...this.records.values()];
    }

    public async update(id: string, input: UpdateCaseInput): Promise<Case | null> {
        const existing = this.records.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...input, updatedAt: "2026-01-02T00:00:00.000Z" } as Case;
        this.records.set(id, updated);
        return updated;
    }

    public async remove(id: string): Promise<boolean> {
        return this.records.delete(id);
    }

    public async close(): Promise<void> {}
}

function appWith(store: CaseStore | null): Hono {
    const app = new Hono();
    app.onError(errorHandler);
    app.route("/", new CaseRoutes(store));
    return app;
}

const VALID: CreateCaseInput = {
    kind: "message",
    title: "Suspicious message",
    inputs: { text: "pay now" },
};

const postJson = (body: unknown) =>
    ({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    }) as const;

describe("CaseRoutes", () => {
    it("returns 503 when no database is configured", async () => {
        const app = appWith(null);
        for (const [path, init] of [
            ["/api/cases", { method: "GET" }],
            ["/api/cases", postJson(VALID)],
            ["/api/cases/anything", { method: "GET" }],
        ] as const) {
            const response = await app.request(path, init);
            expect(response.status).toBe(503);
            expect(((await response.json()) as { code: string }).code).toBe("EXTERNAL_UNAVAILABLE");
        }
    });

    it("creates, lists, reads, updates and deletes a case", async () => {
        const app = appWith(new FakeCaseStore());
        const created = await app.request("/api/cases", postJson(VALID));
        expect(created.status).toBe(201);
        const record = (await created.json()) as Case;
        expect(record.id).toBeTypeOf("string");
        expect(record.status).toBe("draft");
        expect(record.findings).toEqual([]);

        expect((await app.request("/api/cases", { method: "GET" })).status).toBe(200);
        const list = (await (await app.request("/api/cases", { method: "GET" })).json()) as {
            cases: Case[];
        };
        expect(list.cases).toHaveLength(1);

        const read = await app.request(`/api/cases/${record.id}`, { method: "GET" });
        expect(read.status).toBe(200);
        expect(((await read.json()) as Case).id).toBe(record.id);

        const patched = await app.request(`/api/cases/${record.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: "Updated" }),
        });
        expect(patched.status).toBe(200);
        expect(((await patched.json()) as Case).title).toBe("Updated");

        expect((await app.request(`/api/cases/${record.id}`, { method: "DELETE" })).status).toBe(
            204,
        );
        expect((await app.request(`/api/cases/${record.id}`, { method: "GET" })).status).toBe(404);
    });

    it("rejects invalid create and update bodies", async () => {
        const app = appWith(new FakeCaseStore());
        expect((await app.request("/api/cases", postJson({ title: "no kind" }))).status).toBe(400);
        const created = await app.request("/api/cases", postJson(VALID));
        const record = (await created.json()) as Case;
        const patched = await app.request(`/api/cases/${record.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "not-a-status" }),
        });
        expect(patched.status).toBe(400);
    });
});

describe("DatabaseCaseStore", () => {
    it("is unavailable without DATABASE_URL", () => {
        expect(createCaseStore(undefined)).toBeNull();
        expect(createCaseStore("   ")).toBeNull();
        expect(() => DatabaseCaseStore.fromConnectionString("")).toThrow();
    });

    it("maps jsonb rows into Case records", async () => {
        const row = {
            id: randomUUID(),
            kind: "url",
            title: "A case",
            inputs: { url: "https://example.com" },
            findings: [{ label: "spoof", severity: "high", detail: "mismatch" }],
            artifacts: [{ kind: "screenshot", name: "a.png" }],
            next_steps: ["block"],
            limitations: ["offline"],
            status: "active",
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            updated_at: "2026-01-02T00:00:00.000Z",
        };
        const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({ rows: [row] }));
        const store = new DatabaseCaseStore({ query, end: vi.fn() } as unknown as Pool);
        const record = await store.get(row.id);
        expect(record).toMatchObject({
            id: row.id,
            kind: "url",
            status: "active",
            nextSteps: ["block"],
            createdAt: "2026-01-01T00:00:00.000Z",
        });
        expect(record?.findings).toEqual(row.findings);
    });

    it("writes all columns on create and removes with rowCount", async () => {
        const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({
            rows: [],
            rowCount: 1,
        }));
        const store = new DatabaseCaseStore({ query, end: vi.fn() } as unknown as Pool);
        const record = await store.create(VALID);
        expect(query).toHaveBeenCalledTimes(1);
        expect(query.mock.calls[0]?.[1]).toHaveLength(11);
        expect(record.inputs).toEqual(VALID.inputs);
        expect(await store.remove(record.id)).toBe(true);
    });
});
