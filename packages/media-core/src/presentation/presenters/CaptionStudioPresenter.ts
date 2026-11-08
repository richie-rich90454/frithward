import { CaptionProject } from "../../domain/CaptionProject.js";
import { CaptionStudioViewModel } from "../view-models/CaptionStudioViewModel.js";

export class CaptionStudioPresenter {
    public present(project: CaptionProject, selectedSegmentId: string | null): CaptionStudioViewModel {
        return CaptionStudioViewModel.fromProject(project, selectedSegmentId);
    }
}
