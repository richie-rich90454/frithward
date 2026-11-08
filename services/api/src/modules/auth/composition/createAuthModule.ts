import { AuthRoutes } from "../presentation/AuthRoutes.js";

export function createAuthModule(): { routes: AuthRoutes } {
    return { routes: new AuthRoutes() };
}
