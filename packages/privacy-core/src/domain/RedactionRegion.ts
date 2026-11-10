import { AppError } from "@frithward/contracts";
import type { MetadataFindingKind } from "./MetadataFinding.js";

export class RedactionRegion {
    public readonly x: number;
    public readonly y: number;
    public readonly width: number;
    public readonly height: number;
    public readonly kind: MetadataFindingKind;

    public constructor(input: {
        x: number;
        y: number;
        width: number;
        height: number;
        kind: MetadataFindingKind;
    }) {
        if (!Number.isFinite(input.x) || input.x < 0 || input.x > 1)
            throw new AppError("VALIDATION_FAILED", "Redaction x must be between 0 and 1.");
        if (!Number.isFinite(input.y) || input.y < 0 || input.y > 1)
            throw new AppError("VALIDATION_FAILED", "Redaction y must be between 0 and 1.");
        if (!Number.isFinite(input.width) || input.width <= 0 || input.x + input.width > 1)
            throw new AppError("VALIDATION_FAILED", "Redaction width must fit within the frame.");
        if (!Number.isFinite(input.height) || input.height <= 0 || input.y + input.height > 1)
            throw new AppError("VALIDATION_FAILED", "Redaction height must fit within the frame.");
        this.x = input.x;
        this.y = input.y;
        this.width = input.width;
        this.height = input.height;
        this.kind = input.kind;
    }

    public contains(x: number, y: number): boolean {
        return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
    }
}
