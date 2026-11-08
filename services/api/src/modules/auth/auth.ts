import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./schema.js";

export function createAuth(databaseUrl: string) {
    if (databaseUrl.trim().length === 0) throw new Error("Database URL is required.");
    return betterAuth({
        database: drizzleAdapter(schema, {
            provider: "pg"
        }),
        secret: process.env.BETTER_AUTH_SECRET ?? "frithward-local-dev-secret"
    });
}
