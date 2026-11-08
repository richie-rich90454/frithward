export class AccessibilityWorkshopTool {
    public checkLabel(hasLabel: boolean): string {
        return hasLabel ? "Labels present." : "Add a visible label; placeholders do not replace labels.";
    }
}
