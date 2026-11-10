export interface SubtitleSegmentInput {
    id: string;
    startMs: number;
    endMs: number;
    text: string;
    speakerId: string | null;
}

export interface SubtitleRenderRequest {
    projectId: string;
    title: string;
    language: string;
    format: "vtt" | "srt";
    segments: readonly SubtitleSegmentInput[];
}

export interface SubtitleRenderer {
    render(input: SubtitleRenderRequest): string;
}
