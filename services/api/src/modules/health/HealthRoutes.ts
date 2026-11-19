import { Pool } from "pg";
import { OpenAPIHono } from "@hono/zod-openapi";
import { healthRoute } from "../../presentation/http/routes.js";
import { validationHook } from "../../presentation/http/validationHook.js";

export type DatabaseStatus = "connected" | "unavailable" | "not-configured";

export interface DatabaseHealth {
    configured: boolean;
    check(): Promise<boolean>;
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
            return context.json({ status: "ok", service: "api", database }, 200);
        });
    }
}
