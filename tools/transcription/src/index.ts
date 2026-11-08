export interface TranscriptionRequest {
    audioId: string;
    language: string;
}

export class TranscriptionTool {
    public describe(request: TranscriptionRequest): string {
        if (request.audioId.trim().length === 0) throw new Error("Audio id required.");
        if (request.language.trim().length === 0) throw new Error("Language required.");
        return `Transcription queued for ${request.audioId} in ${request.language}.`;
    }
}
