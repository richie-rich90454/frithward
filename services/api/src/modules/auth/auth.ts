import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { AppError } from "@frithward/contracts";
import * as schema from "./schema.js";

function resolveSecret(): string {
    const configured = process.env.BETTER_AUTH_SECRET;
    if (configured && configured.trim().length > 0) return configured;
    if (process.env.NODE_ENV === "production")
        throw new Error("BETTER_AUTH_SECRET must be set in production.");
    // Local dev only: ephemeral secret, so sessions will not survive a restart.
    return randomBytes(32).toString("hex");
}

export function createAuth(databaseUrl: string) {
    if (databaseUrl.trim().length === 0)
        throw new AppError("EXTERNAL_UNAVAILABLE", "Database URL is required for authentication.");
    const pool = new Pool({ connectionString: databaseUrl });
    const database = drizzle(pool, { schema });
    const baseURL =
        process.env.BETTER_AUTH_URL ?? process.env.FRITHWARD_API ?? "http://localhost:3000";
    const origins = [process.env.CORS_ORIGIN, process.env.FRITHWARD_DOMAIN]
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .map((value) => value.trim());
    return betterAuth({
        database: drizzleAdapter(database, { provider: "pg", schema }),
        secret: resolveSecret(),
        baseURL,
        trustedOrigins: origins.length > 0 ? origins : [baseURL],
        emailAndPassword: { enabled: true },
        advanced: {
            // The database owns uuid primary keys via gen_random_uuid(); the default
            // 32-character alphanumeric ids are not valid Postgres uuids.
            database: { generateId: "uuid" },
        },
    });
}
