import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "./schema.js";

// Better Auth's Drizzle adapter validates the exported table keys and each
// table's JS column keys against its core field names.
const expectedColumns: Record<string, string[]> = {
    user: ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"],
    session: [
        "id",
        "userId",
        "expiresAt",
        "token",
        "createdAt",
        "updatedAt",
        "ipAddress",
        "userAgent",
    ],
    account: [
        "id",
        "userId",
        "accountId",
        "providerId",
        "accessToken",
        "refreshToken",
        "idToken",
        "accessTokenExpiresAt",
        "refreshTokenExpiresAt",
        "scope",
        "password",
        "createdAt",
        "updatedAt",
    ],
    verification: ["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"],
};

describe("Better Auth Drizzle schema", () => {
    it.each(Object.entries(expectedColumns))(
        "exports %s with the expected columns",
        (name, columns) => {
            const table = schema[name as keyof typeof schema];
            expect(table).toBeDefined();
            expect(Object.keys(getTableColumns(table as never))).toEqual(columns);
        },
    );

    it("maps columns to snake_case names while keeping camelCase field keys", () => {
        const user = getTableColumns(schema.user);
        expect(user.emailVerified.name).toBe("email_verified");
        expect(user.updatedAt.name).toBe("updated_at");
        const session = getTableColumns(schema.session);
        expect(session.userId.name).toBe("user_id");
        expect(session.ipAddress.name).toBe("ip_address");
        expect(session.userAgent.name).toBe("user_agent");
    });

    it("keeps optional Better Auth fields nullable or defaulted so inserts are not blocked", () => {
        const user = getTableColumns(schema.user);
        expect(user.name.notNull).toBe(true);
        expect(user.emailVerified.notNull).toBe(true);
        expect(user.image.notNull).toBe(false);
        const session = getTableColumns(schema.session);
        expect(session.token.notNull).toBe(true);
        expect(session.ipAddress.notNull).toBe(false);
        expect(session.userAgent.notNull).toBe(false);
        const account = getTableColumns(schema.account);
        for (const field of [
            "accessToken",
            "refreshToken",
            "idToken",
            "scope",
            "password",
        ] as const)
            expect(account[field].notNull).toBe(false);
    });

    it("retains the application tables", () => {
        expect(getTableColumns(schema.scamAnalyses)).toHaveProperty("channel");
        expect(getTableColumns(schema.jobStatus)).toHaveProperty("jobId");
    });
});
