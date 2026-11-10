export * from "@frithward/media-analysis";

export interface AudioEdit {
    id: string;
    startMs: number;
    endMs: number;
}

export class AudioWorkshopTool {
    private readonly edits: AudioEdit[] = [];

    public addEdit(edit: AudioEdit): void {
        if (edit.endMs <= edit.startMs) throw new Error("Edit end must exceed start.");
        this.edits.push(edit);
    }

    public listEdits(): readonly AudioEdit[] {
        return [...this.edits];
    }
}
