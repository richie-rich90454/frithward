import type { SubtitleRenderRequest, SubtitleRenderer } from "../ports/SubtitleRenderer.js";

export class ExportCaptionsUseCase {
    public constructor(private readonly renderer: SubtitleRenderer) {}

    public execute(input: SubtitleRenderRequest): string {
        return this.renderer.render(input);
    }
}
