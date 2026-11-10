export type DetectionSignalSeverity = "low" | "medium" | "high";

export interface DetectionSignal {
    readonly id: string;
    readonly label: string;
    readonly detail: string;
    readonly severity: DetectionSignalSeverity;
    readonly evidence: string;
    readonly source: string;
}
