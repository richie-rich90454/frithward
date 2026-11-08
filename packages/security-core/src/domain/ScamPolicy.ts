import { AppError } from "@frithward/contracts";

export class ScamPolicy {
    public assertTextWithinLimits(text: string): void {
        if (text.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Message text required.");
        if (text.length > 20000)
            throw new AppError("VALIDATION_FAILED", "Message exceeds analysis limit.");
    }
}
