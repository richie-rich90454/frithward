import { OpenAPIHono } from "@hono/zod-openapi";
import { sessionRoute } from "../../../presentation/http/routes.js";
import { validationHook } from "../../../presentation/http/validationHook.js";
import type { SessionPort } from "../../../middleware/requireSession.js";

export class AuthRoutes extends OpenAPIHono {
    public constructor(private readonly sessionPort: SessionPort) {
        super({ defaultHook: validationHook });
        this.openapi(sessionRoute, async (context) => {
            const session = await this.sessionPort.getSession(context.req.raw.headers);
            if (!session) return context.json({ authenticated: false, user: null }, 200);
            return context.json({ authenticated: true, user: session.user }, 200);
        });
    }
}
