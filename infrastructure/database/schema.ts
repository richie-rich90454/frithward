import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Kept in sync with services/api auth and job schemas so the Drizzle schema matches the migrations.
export const user = pgTable("user", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().default(""),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
});

export const account = pgTable("account", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scamAnalyses = pgTable("scam_analyses", {
    id: uuid("id").defaultRandom().primaryKey(),
    channel: text("channel").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobStatus = pgTable("job_status", {
    jobId: text("job_id").primaryKey(),
    status: text("status").notNull(),
    result: jsonb("result").$type<unknown>(),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mirrors 0002_cases_and_reports.sql.
export const communityReports = pgTable("community_reports", {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    findings: jsonb("findings").$type<unknown>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incidentReports = pgTable("incident_reports", {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    severity: text("severity").notNull(),
    details: text("details").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    inputs: jsonb("inputs").$type<unknown>().notNull(),
    findings: jsonb("findings").$type<unknown>().notNull(),
    artifacts: jsonb("artifacts").$type<unknown>().notNull(),
    nextSteps: jsonb("next_steps").$type<unknown>().notNull(),
    limitations: jsonb("limitations").$type<unknown>().notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
