import { AuthRoutes } from "../presentation/AuthRoutes.js";
import { BetterAuthSessionPort } from "../presentation/BetterAuthSessionPort.js";
import { createAuth } from "../auth.js";
import type { SessionPort } from "../../../middleware/requireSession.js";

export function createAuthModule(databaseUrl: string): {
    routes: AuthRoutes;
    sessionPort: SessionPort;
} {
    const auth = createAuth(databaseUrl);
    return { routes: new AuthRoutes(), sessionPort: new BetterAuthSessionPort(auth) };
}
