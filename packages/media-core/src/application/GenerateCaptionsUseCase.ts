import { AppError } from "@frithward/contracts";
import { CaptionProject } from "../domain/CaptionProject.js";
import { SubtitleSegment } from "../domain/SubtitleSegment.js";
import type { SpeechRecognitionPort } from "../ports/SpeechRecognitionPort.js";

export class GenerateCaptionsUseCase {
    private readonly recognizer: SpeechRecognitionPort;
    private readonly repository: { save(project: CaptionProject): Promise<void> };

    public constructor(
        recognizer: SpeechRecognitionPort,
        repository: { save(project: CaptionProject): Promise<void> },
    ) {
        this.recognizer = recognizer;
        this.repository = repository;
    }

    public async execute(input: {
        project: CaptionProject;
        audio: ArrayBuffer;
        signal: AbortSignal;
    }): Promise<CaptionProject> {
        if (input.signal.aborted) throw new AppError("CANCELLED", "Caption generation cancelled.");
        const utterances = await this.recognizer.recognize({
            audio: input.audio,
            language: input.project.language,
            signal: input.signal,
        });
        let index = input.project.segmentCount;
        for (const utterance of utterances) {
            if (input.signal.aborted)
                throw new AppError("CANCELLED", "Caption generation cancelled.");
            input.project.addSegment(
                new SubtitleSegment({
                    id: `${input.project.id}-seg-${index}`,
                    startMs: utterance.startMs,
                    endMs: utterance.endMs,
                    text: utterance.text,
                    speakerId: utterance.speakerId,
                }),
            );
            index += 1;
        }
        await this.repository.save(input.project);
        return input.project;
    }
}
