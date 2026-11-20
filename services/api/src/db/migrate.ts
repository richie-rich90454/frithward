import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AppError } from "@frithward/contracts";
import { Client } from "pg";

export interface SqlExecutor {
    query(text: string): Promise<unknown>;
}

export const MIGRATION_FILES = [
    fileURLToPath(new URL("../../../../infrastructure/database/0001_init.sql", import.meta.url)),
    fileURLToPath(
        new URL("../../../../infrastructure/database/0002_cases_and_reports.sql", import.meta.url),
    ),
];

/** Splits the idempotent DDL file into individual statements. */
export function migrationStatements(sql: string): string[] {
    return sql
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);
}

export async function runMigrations(executor: SqlExecutor, sql: string): Promise<number> {
    const statements = migrationStatements(sql);
    for (const statement of statements) await executor.query(statement);
    return statements.length;
}

export async function migrate(connectionString?: string): Promise<number> {
    const url = connectionString ?? process.env.DATABASE_URL;
    if (!url || url.trim().length === 0)
        throw new AppError("EXTERNAL_UNAVAILABLE", "DATABASE_URL is required to migrate.");
    const migrations = await Promise.all(MIGRATION_FILES.map((file) => readFile(file, "utf8")));
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
        return await runMigrations(client, migrations.join("\n"));
    } finally {
        await client.end();
    }
}

if (import.meta.main) {
    migrate()
        .then((count) => console.log(`Applied ${count} migration statements.`))
        .catch((cause: unknown) => {
            console.error("Migration failed:", cause);
            process.exitCode = 1;
        });
}
