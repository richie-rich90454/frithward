import { AuthRoutes } from "../presentation/AuthRoutes.js";
import { BetterAuthSessionPort } from "../presentation/BetterAuthSessionPort.js";
import { createAuth } from "../auth.js";
import type { SessionPort } from "../../../middleware/requireSession.js";

export function createAuthModule(databaseUrl: string | undefined): {
    routes: AuthRoutes;
    sessionPort: SessionPort;
    auth: ReturnType<typeof createAuth> | null;
} {
    const auth = databaseUrl ? createAuth(databaseUrl) : null;
    const sessionPort = new BetterAuthSessionPort(auth);
    return { routes: new AuthRoutes(sessionPort), sessionPort, auth };
}
