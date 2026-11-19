import { AppError } from "@frithward/contracts";
import type { Session, SessionPort } from "../../../middleware/requireSession.js";
import type { createAuth } from "../auth.js";

export class BetterAuthSessionPort implements SessionPort {
    public constructor(private readonly auth: ReturnType<typeof createAuth> | null) {}

    public async getSession(headers: Headers): Promise<Session | null> {
        if (this.auth === null)
            throw new AppError("EXTERNAL_UNAVAILABLE", "Authentication database is not configured.");
        try {
            const result = await this.auth.api.getSession({ headers });
            if (!result) return null;
            return {
                token: result.session.token,
                userId: result.session.userId,
                expiresAt: new Date(result.session.expiresAt).toISOString(),
                user: result.user
                    ? { id: result.user.id, email: result.user.email }
                    : null,
            };
        } catch (cause) {
            // Never forge a session when the auth database cannot be reached.
            throw new AppError("EXTERNAL_UNAVAILABLE", "Authentication database is unavailable.", cause);
        }
    }
}
