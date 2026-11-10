import { OpenAPIHono } from "@hono/zod-openapi";
import { sessionRoute } from "../../../presentation/http/routes.js";
import { validationHook } from "../../../presentation/http/validationHook.js";

export class AuthRoutes extends OpenAPIHono {
    public constructor() {
        super({ defaultHook: validationHook });
        this.openapi(sessionRoute, (context) => context.json({ configured: true }, 200));
    }
}
