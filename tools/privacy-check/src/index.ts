export class PrivacyCheckTool {
    public needsRedaction(findings: readonly string[]): boolean {
        return findings.length > 0;
    }
}
