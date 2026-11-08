import { Hono } from "hono";
import { AuthRoutes } from "./AuthRoutes.js";

export function createAuthModule(): { routes: AuthRoutes } {
    return { routes: new AuthRoutes() };
}
