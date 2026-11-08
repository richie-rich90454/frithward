import { CaptionProject } from "../domain/CaptionProject.js";

export interface CaptionRepository {
    save(project: CaptionProject): Promise<void>;
    load(id: string): Promise<CaptionProject | null>;
}
