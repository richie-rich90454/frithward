import type { DetectionReport } from "../../domain/DetectionReport.js";
import { MediaCheckViewModel } from "../view-models/MediaCheckViewModel.js";

export class MediaCheckPresenter {
    public present(report: DetectionReport): MediaCheckViewModel {
        return MediaCheckViewModel.fromReport(report);
    }
}
