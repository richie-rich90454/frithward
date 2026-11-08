import { AppError } from "@frithward/contracts";

export class Speaker {
    public readonly id: string;
    public name: string;

    public constructor(id: string, name: string) {
        if (id.trim().length === 0) throw new AppError("VALIDATION_FAILED", "Speaker id required.");
        if (name.trim().length === 0) throw new AppError("VALIDATION_FAILED", "Speaker name required.");
        this.id = id;
        this.name = name;
    }
}
