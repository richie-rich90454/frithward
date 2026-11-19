import type { MiddlewareHandler } from "hono";

// shortcut: relies on Content-Length; chunked requests without the header are
// not size-limited by this guard. Upgrade to a streaming byte counter if needed.
export function bodySizeLimit(maxBytes = 1024 * 1024): MiddlewareHandler {
    return async (context, next) => {
        const length = context.req.header("content-length");
        if (length && Number(length) > maxBytes)
            return context.json({ code: "PAYLOAD_TOO_LARGE", message: "Request body too large." }, 413);
        return next();
    };
}
