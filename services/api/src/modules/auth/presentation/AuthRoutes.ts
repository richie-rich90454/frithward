import { Hono } from "hono";
import { createAuth } from "../auth.js";

export class AuthRoutes extends Hono {
    public constructor() {
        super();
        this.get("/session", (context) => {
            const auth = createAuth(process.env.DATABASE_URL ?? "postgres://frithward:frithward@localhost:5432/frithward");
            return context.json({ configured: Boolean(auth) });
        });
    }
}
