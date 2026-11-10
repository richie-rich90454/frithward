export type UrlRiskLevel = "low" | "medium" | "high";

export interface UrlFinding {
    id: string;
    label: string;
    detail: string;
    severity: UrlRiskLevel;
}

export interface UrlInspectionResult {
    original: string;
    normalizedUrl: string | null;
    hostname: string | null;
    riskLevel: UrlRiskLevel;
    findings: readonly UrlFinding[];
    summary: string;
    limitations: readonly string[];
}
