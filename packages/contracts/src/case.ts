import { z } from "zod";

export const CaseKind = z.enum(["message", "url", "qr", "file", "provenance", "evidence"]);

export type CaseKind = z.infer<typeof CaseKind>;

export const ThemePreference = z.enum(["system", "light", "dark"]);

export type ThemePreference = z.infer<typeof ThemePreference>;

export const CaseStatus = z.enum(["draft", "active", "archived"]);

export type CaseStatus = z.infer<typeof CaseStatus>;

export const CaseFinding = z.object({
    label: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    detail: z.string(),
});

export type CaseFinding = z.infer<typeof CaseFinding>;

export const CaseArtifact = z.object({
    kind: z.string(),
    name: z.string(),
    hash: z.string().optional(),
    url: z.string().optional(),
});

export type CaseArtifact = z.infer<typeof CaseArtifact>;

export const Case = z.object({
    id: z.uuid(),
    kind: CaseKind,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    title: z.string(),
    inputs: z.record(z.string(), z.unknown()),
    findings: z.array(CaseFinding),
    artifacts: z.array(CaseArtifact),
    nextSteps: z.array(z.string()),
    limitations: z.array(z.string()),
    status: CaseStatus,
});

export type Case = z.infer<typeof Case>;

export const CreateCaseInput = Case.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).partial({
    findings: true,
    artifacts: true,
    nextSteps: true,
    limitations: true,
    status: true,
});

export type CreateCaseInput = z.infer<typeof CreateCaseInput>;

export const UpdateCaseInput = Case.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).partial();

export type UpdateCaseInput = z.infer<typeof UpdateCaseInput>;
