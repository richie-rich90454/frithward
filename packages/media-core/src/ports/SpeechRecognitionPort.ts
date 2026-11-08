export interface RecognizedUtterance {
    startMs: number;
    endMs: number;
    text: string;
    speakerId: string | null;
}

export interface SpeechRecognitionPort {
    recognize(input: { audio: ArrayBuffer; language: string; signal: AbortSignal }): Promise<readonly RecognizedUtterance[]>;
}
