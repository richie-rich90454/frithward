import {
    CaptionProject,
    CaptionStudioController as MediaCaptionStudioController,
    CaptionStudioViewModel,
    EditSubtitleUseCase,
} from "@frithward/media-core";
import type { CaptionRepository } from "@frithward/media-core";

class MemoryCaptionRepository implements CaptionRepository {
    public async save(_project: CaptionProject): Promise<void> {
        return;
    }

    public async load(_id: string): Promise<CaptionProject | null> {
        return null;
    }
}

export class CaptionStudioController {
    private readonly controller: MediaCaptionStudioController;
    private readonly listeners = new Set<() => void>();
    private viewModel: CaptionStudioViewModel;
    private error: string | null = null;

    public constructor() {
        const project = new CaptionProject({
            id: "caption-studio",
            title: "Untitled captions",
            language: "en",
        });
        this.controller = new MediaCaptionStudioController({
            project,
            editor: new EditSubtitleUseCase(new MemoryCaptionRepository()),
        });
        this.viewModel = this.controller.getViewModel();
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getViewModel(): CaptionStudioViewModel {
        return this.viewModel;
    }

    public getError(): string | null {
        return this.error;
    }

    public select(segmentId: string): void {
        this.controller.select(segmentId);
        this.refresh();
    }

    public async applyEdit(input: { segmentId: string; text: string }): Promise<void> {
        try {
            await this.controller.applyEdit(input);
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Edit failed.";
        }
        this.refresh();
    }

    private refresh(): void {
        this.viewModel = this.controller.getViewModel();
        for (const listener of this.listeners) listener();
    }
}
