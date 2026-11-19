import { AppError } from "@frithward/contracts";
import type {
    RecognizedUtterance,
    SpeechRecognitionPort,
} from "@frithward/media-core";

export interface TranscriptionRequest {
    audioId: string;
    language: string;
}

export interface TranscribeRequest extends TranscriptionRequest {
    audio: ArrayBuffer;
    signal?: AbortSignal;
}

export class TranscriptionTool {
    public constructor(private readonly recognition?: SpeechRecognitionPort) {}

    public describe(request: TranscriptionRequest): string {
        this.assertRequest(request);
        if (!this.recognition) {
            return `Transcription is unavailable for ${request.audioId}: no speech-recognition engine is configured and no job was started.`;
        }
        return `Transcription is available for ${request.audioId} in ${request.language}; call transcribe() with audio to run the configured engine.`;
    }

    public async transcribe(request: TranscribeRequest): Promise<readonly RecognizedUtterance[]> {
        this.assertRequest(request);
        const recognition = this.recognition;
        if (!recognition) {
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "Transcription requires a SpeechRecognitionPort; none is configured.",
            );
        }
        if (!(request.audio instanceof ArrayBuffer)) {
            throw new AppError("VALIDATION_FAILED", "Audio buffer required.");
        }
        const signal = request.signal ?? new AbortController().signal;
        return recognition.recognize({ audio: request.audio, language: request.language, signal });
    }

    private assertRequest(request: TranscriptionRequest): void {
        if (request.audioId.trim().length === 0) throw new Error("Audio id required.");
        if (request.language.trim().length === 0) throw new Error("Language required.");
    }
}
