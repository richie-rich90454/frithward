import { AppError } from "@frithward/contracts";

export class PrivacyPolicy {
    public assertMetadataSafe(findings: readonly { kind: string }[]): void {
        const blocked = findings.filter((finding) => finding.kind === "exif-gps");
        if (blocked.length > 0) {
            throw new AppError("VALIDATION_FAILED", "Remove location metadata before sharing.");
        }
    }
}
