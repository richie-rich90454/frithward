import { CaptionProject } from "../domain/CaptionProject.js";
import type { CaptionRepository } from "../ports/CaptionRepository.js";

export class EditSubtitleUseCase {
    private readonly repository: CaptionRepository;

    public constructor(repository: CaptionRepository) {
        this.repository = repository;
    }

    public async execute(input: {
        project: CaptionProject;
        segmentId: string;
        text?: string;
        startMs?: number;
        endMs?: number;
    }): Promise<CaptionProject> {
        const segment = input.project.getSegment(input.segmentId);
        if (input.text !== undefined) segment.setText(input.text);
        if (input.startMs !== undefined || input.endMs !== undefined) {
            segment.retime(input.startMs ?? segment.startMs, input.endMs ?? segment.endMs);
        }
        input.project.replaceSegment(segment);
        await this.repository.save(input.project);
        return input.project;
    }
}
