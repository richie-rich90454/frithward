import { z } from "@hono/zod-openapi";

export const HealthResponse = z.object({
    status: z.string(),
    service: z.string(),
    database: z.enum(["connected", "unavailable", "not-configured"]),
});

export const AnalyzeMessageRequest = z.object({
    text: z.string().min(1).max(20000),
});

export const ScamIndicatorResponse = z.object({
    id: z.string(),
    label: z.string(),
    detail: z.string(),
    severity: z.enum(["low", "medium", "high"]),
});

export const AnalyzeMessageResponse = z.object({
    id: z.string(),
    channel: z.enum(["message", "url", "qr", "image", "audio"]),
    indicators: z.array(ScamIndicatorResponse),
    summary: z.string(),
    nextSteps: z.array(z.string()),
    limitations: z.array(z.string()),
    createdAt: z.string(),
});

export const EnqueueAnalysisResponse = z.object({
    jobId: z.string(),
});

export const SessionResponse = z.object({
    authenticated: z.boolean(),
    user: z
        .object({
            id: z.string(),
            email: z.string(),
        })
        .nullable(),
});

export const PrivacyFindingSchema = z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    detail: z.string(),
    remediation: z.string(),
});

export const PrivacyInspectRequest = z.object({
    findings: z.array(PrivacyFindingSchema).max(1000),
});

export const PrivacyRedactRequest = z.object({
    findings: z.array(PrivacyFindingSchema).max(1000),
});

export const ProvenanceInspectRequest = z.object({
    id: z.string().min(1),
    signatureStatus: z.enum(["valid", "invalid", "missing"]),
    signer: z.string().nullable(),
    assetSha256: z.string().min(1),
    manifest: z.string().nullable(),
});

export const CaptionSegmentInput = z.object({
    id: z.string().min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().min(1),
    speakerId: z.string().nullable().optional(),
});

export const CaptionExportRequest = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    language: z.string().min(1),
    format: z.enum(["vtt", "srt"]),
    segments: z.array(CaptionSegmentInput).max(1000),
});
