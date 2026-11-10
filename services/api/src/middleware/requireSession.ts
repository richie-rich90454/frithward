import type { MiddlewareHandler } from "hono";
import { AppError } from "@frithward/contracts";

export interface Session {
    token: string;
    userId: string;
    expiresAt: string;
}

export interface SessionPort {
    getSession(headers: Headers): Promise<Session | null>;
}

export function requireSession(port: SessionPort): MiddlewareHandler {
    return async (context, next) => {
        const session = await port.getSession(context.req.raw.headers);
        if (!session) throw new AppError("UNAUTHORIZED", "Session required.");
        await next();
    };
}
