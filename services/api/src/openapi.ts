import { OpenAPIHono } from "@hono/zod-openapi";
import { analyzeMessageRoute, healthRoute, sessionRoute } from "./presentation/http/routes.js";

const app = new OpenAPIHono();
app.openAPIRegistry.registerPath(healthRoute);
app.openAPIRegistry.registerPath(analyzeMessageRoute);
app.openAPIRegistry.registerPath(sessionRoute);

export type OpenAPIDocument = ReturnType<OpenAPIHono["getOpenAPI31Document"]>;

export const openApiDocument: OpenAPIDocument = app.getOpenAPI31Document({
    openapi: "3.1.0",
    info: {
        title: "Frithward API",
        version: "0.1.0",
        description: "Frithward backend API.",
    },
});
