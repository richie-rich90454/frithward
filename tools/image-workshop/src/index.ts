export * from "@frithward/media-analysis";

export interface RedactionRegion {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export class ImageWorkshopTool {
    private readonly regions: RedactionRegion[] = [];

    public addRegion(region: RedactionRegion): void {
        if (region.width <= 0 || region.height <= 0)
            throw new Error("Region size must be positive.");
        this.regions.push(region);
    }

    public listRegions(): readonly RedactionRegion[] {
        return [...this.regions];
    }
}
