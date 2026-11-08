import { z } from "zod";

export const MediaKind = z.enum(["audio", "image", "video", "document", "text"]);

export type MediaKind = z.infer<typeof MediaKind>;

export const MediaAsset = z.object({
    id: z.string(),
    kind: MediaKind,
    fileName: z.string(),
    sizeBytes: z.number().int().nonnegative(),
    mimeType: z.string(),
    sha256: z.string(),
    createdAt: z.string(),
});

export type MediaAsset = z.infer<typeof MediaAsset>;

export const CaptionSegmentDto = z.object({
    id: z.string(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string(),
    speakerId: z.string().nullable(),
});

export type CaptionSegmentDto = z.infer<typeof CaptionSegmentDto>;

export const CaptionProjectDto = z.object({
    id: z.string(),
    title: z.string(),
    language: z.string(),
    segments: z.array(CaptionSegmentDto),
});

export type CaptionProjectDto = z.infer<typeof CaptionProjectDto>;
