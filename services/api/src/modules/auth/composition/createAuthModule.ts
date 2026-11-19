import { AuthRoutes } from "../presentation/AuthRoutes.js";
import { BetterAuthSessionPort } from "../presentation/BetterAuthSessionPort.js";
import { createAuth } from "../auth.js";
import type { SessionPort } from "../../../middleware/requireSession.js";

export function createAuthModule(databaseUrl: string | undefined): {
    routes: AuthRoutes;
    sessionPort: SessionPort;
} {
    const sessionPort = new BetterAuthSessionPort(
        databaseUrl ? createAuth(databaseUrl) : null,
    );
    return { routes: new AuthRoutes(sessionPort), sessionPort };
}
