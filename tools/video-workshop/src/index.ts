export class VideoWorkshopTool {
    private readonly tracks = new Set<string>();

    public addTrack(name: string): void {
        if (name.trim().length === 0) throw new Error("Track name required.");
        this.tracks.add(name);
    }

    public listTracks(): readonly string[] {
        return [...this.tracks].sort();
    }
}
