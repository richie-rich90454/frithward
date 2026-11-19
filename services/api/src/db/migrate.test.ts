import { describe, expect, it, vi } from "vitest";
import { migrationStatements, runMigrations, type SqlExecutor } from "./migrate.js";

describe("migrations", () => {
    it("splits the DDL file into statements", () => {
        expect(migrationStatements("create table a ();\ncreate table b ();")).toHaveLength(2);
    });

    it("executes every statement against the pg client", async () => {
        const query = vi.fn(async (_sql: string) => ({ rows: [] }));
        const executor: SqlExecutor = { query };
        const count = await runMigrations(
            executor,
            "create table if not exists a ();create table if not exists b ();",
        );
        expect(count).toBe(2);
        expect(query).toHaveBeenCalledTimes(2);
        expect(query.mock.calls[0]?.[0]).toContain("if not exists");
    });

    it("propagates a failed statement", async () => {
        const executor: SqlExecutor = {
            query: async () => {
                throw new Error("db down");
            },
        };
        await expect(runMigrations(executor, "create table a ();")).rejects.toThrow("db down");
    });
});
