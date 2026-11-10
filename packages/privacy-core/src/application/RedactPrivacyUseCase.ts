import type { PrivacyFinding } from "../domain/PrivacyFinding.js";

export interface RedactionResult {
    findings: readonly PrivacyFinding[];
    redactedCount: number;
}

export class RedactPrivacyUseCase {
    public execute(input: { findings: readonly PrivacyFinding[] }): RedactionResult {
        const findings: PrivacyFinding[] = [];
        let redactedCount = 0;
        for (const finding of input.findings) {
            if (finding.kind === "exif-gps") {
                redactedCount += 1;
                continue;
            }
            findings.push(finding);
        }
        return { findings, redactedCount };
    }
}
