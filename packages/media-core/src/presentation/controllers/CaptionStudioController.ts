import { AppError } from "@frithward/contracts";
import { EditSubtitleUseCase } from "../../application/EditSubtitleUseCase.js";
import { CaptionProject } from "../../domain/CaptionProject.js";
import { CaptionStudioPresenter } from "../presenters/CaptionStudioPresenter.js";
import { CaptionStudioViewModel } from "../view-models/CaptionStudioViewModel.js";

export class CaptionStudioController {
    private readonly project: CaptionProject;
    private readonly editor: EditSubtitleUseCase;
    private readonly presenter: CaptionStudioPresenter;
    private selectedSegmentId: string | null;
    private error: string | null;

    public constructor(input: {
        project: CaptionProject;
        editor: EditSubtitleUseCase;
        presenter?: CaptionStudioPresenter;
    }) {
        this.project = input.project;
        this.editor = input.editor;
        this.presenter = input.presenter ?? new CaptionStudioPresenter();
        this.selectedSegmentId = null;
        this.error = null;
    }

    public getViewModel(): CaptionStudioViewModel {
        return this.presenter.present(this.project, this.selectedSegmentId);
    }

    public getError(): string | null {
        return this.error;
    }

    public select(segmentId: string): void {
        this.project.getSegment(segmentId);
        this.selectedSegmentId = segmentId;
    }

    public async applyEdit(input: { segmentId: string; text?: string }): Promise<void> {
        try {
            await this.editor.execute({
                project: this.project,
                segmentId: input.segmentId,
                text: input.text,
            });
            this.selectedSegmentId = input.segmentId;
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof AppError ? cause.message : "Edit failed.";
            throw cause;
        }
    }
}
