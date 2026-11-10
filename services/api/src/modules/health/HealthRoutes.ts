import { OpenAPIHono } from "@hono/zod-openapi";
import { healthRoute } from "../../presentation/http/routes.js";
import { validationHook } from "../../presentation/http/validationHook.js";

export class HealthRoutes extends OpenAPIHono {
    public constructor() {
        super({ defaultHook: validationHook });
        this.openapi(healthRoute, (context) => context.json({ status: "ok", service: "api" }, 200));
    }
}
