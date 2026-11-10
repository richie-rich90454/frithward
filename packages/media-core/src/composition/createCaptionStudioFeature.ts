import { EditSubtitleUseCase } from "../application/EditSubtitleUseCase.js";
import { ExportSubtitlesUseCase } from "../application/ExportSubtitlesUseCase.js";
import { GenerateCaptionsUseCase } from "../application/GenerateCaptionsUseCase.js";
import { CaptionProject } from "../domain/CaptionProject.js";
import { IndexedDbCaptionRepository } from "../infrastructure/browser/IndexedDbCaptionRepository.js";
import type { CaptionRepository } from "../ports/CaptionRepository.js";
import type { SpeechRecognitionPort } from "../ports/SpeechRecognitionPort.js";
import { CaptionStudioController } from "../presentation/controllers/CaptionStudioController.js";

export interface CaptionStudioFeatureOptions {
    readonly recognizer: SpeechRecognitionPort;
    readonly repository?: CaptionRepository;
    readonly project?: {
        readonly id: string;
        readonly title: string;
        readonly language: string;
    };
}

export interface CaptionStudioFeature {
    readonly project: CaptionProject;
    readonly repository: CaptionRepository;
    readonly generate: GenerateCaptionsUseCase;
    readonly edit: EditSubtitleUseCase;
    readonly export: ExportSubtitlesUseCase;
    readonly controller: CaptionStudioController;
}

export function createCaptionStudioFeature(
    options: CaptionStudioFeatureOptions,
): CaptionStudioFeature {
    const repository = options.repository ?? new IndexedDbCaptionRepository();
    const project = new CaptionProject(
        options.project ?? { id: "caption-project", title: "Caption project", language: "en" },
    );
    const generate = new GenerateCaptionsUseCase(options.recognizer, repository);
    const edit = new EditSubtitleUseCase(repository);
    const exportSubtitles = new ExportSubtitlesUseCase();
    const controller = new CaptionStudioController({ project, editor: edit });
    return {
        project,
        repository,
        generate,
        edit,
        export: exportSubtitles,
        controller,
    };
}
