import { Pool } from "pg";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { HealthResponse } from "../../presentation/http/schemas.js";
import { validationHook } from "../../presentation/http/validationHook.js";

// The shared healthRoute schema only declares 200; declare 503 here so the
// handler can be honest about an unavailable database without editing it.
const healthRoute = createRoute({
    method: "get",
    path: "/health",
    responses: {
        200: {
            description: "Service status.",
            content: { "application/json": { schema: HealthResponse } },
        },
        503: {
            description: "Database configured but unavailable.",
            content: { "application/json": { schema: HealthResponse } },
        },
    },
});

export type DatabaseStatus = "connected" | "unavailable" | "not-configured";

export interface DatabaseHealth {
    configured: boolean;
    check(): Promise<boolean>;
    close(): Promise<void>;
}

export function createDatabaseHealthCheck(databaseUrl: string | undefined): DatabaseHealth {
    const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
    return {
        configured: pool !== null,
        async check(): Promise<boolean> {
            if (pool === null) return false;
            try {
                await pool.query("SELECT 1");
                return true;
            } catch {
                return false;
            }
        },
        async close(): Promise<void> {
            await pool?.end();
        },
    };
}

export class HealthRoutes extends OpenAPIHono {
    public constructor(
        private readonly checkDatabase: () => Promise<boolean>,
        private readonly databaseConfigured: boolean,
    ) {
        super({ defaultHook: validationHook });
        this.openapi(healthRoute, async (context) => {
            const database: DatabaseStatus = !this.databaseConfigured
                ? "not-configured"
                : (await this.checkDatabase())
                  ? "connected"
                  : "unavailable";
            const unhealthy = database === "unavailable";
            return context.json(
                { status: unhealthy ? "unavailable" : "ok", service: "api", database },
                unhealthy ? 503 : 200,
            );
        });
    }
}
