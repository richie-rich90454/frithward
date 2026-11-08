import { z } from "zod";

export const ScamChannel = z.enum(["message", "url", "qr", "image", "audio"]);

export type ScamChannel = z.infer<typeof ScamChannel>;

export const ScamIndicator = z.object({
    id: z.string(),
    label: z.string(),
    detail: z.string(),
    severity: z.enum(["low", "medium", "high"]),
});

export type ScamIndicator = z.infer<typeof ScamIndicator>;

export const ScamAnalysisResult = z.object({
    id: z.string(),
    channel: ScamChannel,
    indicators: z.array(ScamIndicator),
    summary: z.string(),
    nextSteps: z.array(z.string()),
    limitations: z.array(z.string()),
    createdAt: z.string(),
});

export type ScamAnalysisResult = z.infer<typeof ScamAnalysisResult>;

export const AnalyzeMessageRequest = z.object({
    text: z.string().min(1).max(20000),
});

export type AnalyzeMessageRequest = z.infer<typeof AnalyzeMessageRequest>;
