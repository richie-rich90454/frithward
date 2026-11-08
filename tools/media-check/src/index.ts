export class MediaCheckTool {
    public summarize(signals: readonly string[]): string {
        if (signals.length === 0) return "No signals detected.";
        return `${signals.length} signal(s) detected: ${signals.join(", ")}. This does not establish authenticity.`;
    }
}
