import type { Session, SessionPort } from "../../../middleware/requireSession.js";
import type { createAuth } from "../auth.js";

export class BetterAuthSessionPort implements SessionPort {
    public constructor(private readonly auth: ReturnType<typeof createAuth>) {}

    public async getSession(headers: Headers): Promise<Session | null> {
        const result = await this.auth.api.getSession({ headers });
        if (!result) return null;
        return {
            token: result.session.token,
            userId: result.session.userId,
            expiresAt: result.session.expiresAt.toISOString(),
        };
    }
}
