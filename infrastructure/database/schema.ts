import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Kept in sync with services/api auth and job schemas so the Drizzle schema matches 0001_init.sql.
export const user = pgTable("user", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
