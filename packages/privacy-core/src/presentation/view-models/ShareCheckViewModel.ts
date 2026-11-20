import { RESULT_CODES } from "@frithward/contracts";
import type {
    MetadataFinding,
    MetadataFindingSeverity,
    MetadataInspectionResult,
} from "../../domain/MetadataFinding.js";

export interface ShareCheckFindingView {
    id: string;
    kind: MetadataFinding["kind"];
    detail: string;
    remediation: string;
    severity: MetadataFindingSeverity;
}

export interface ShareCheckViewModelData {
    fileName: string;
    safeToShare: boolean;
    findings: readonly ShareCheckFindingView[];
    redactionRequired: boolean;
    remediation: readonly string[];
    summary: string;
    summaryCode?: string | undefined;
}

export class ShareCheckViewModel {
    public readonly fileName: string;
    public readonly safeToShare: boolean;
    public readonly findings: readonly ShareCheckFindingView[];
    public readonly redactionRequired: boolean;
    public readonly remediation: readonly string[];
    public readonly summary: string;
    public readonly summaryCode: string | undefined;

    private constructor(input: ShareCheckViewModelData) {
        this.fileName = input.fileName;
        this.safeToShare = input.safeToShare;
        this.findings = input.findings;
        this.redactionRequired = input.redactionRequired;
        this.remediation = input.remediation;
        this.summary = input.summary;
        this.summaryCode = input.summaryCode;
    }

    public static fromResult(
        result: MetadataInspectionResult,
        redactionRequired: boolean,
    ): ShareCheckViewModel {
        const safeToShare = result.safeToShare && !redactionRequired;
        const findings = result.findings.map((finding) => ({
            id: finding.id,
            kind: finding.kind,
            detail: finding.detail,
            remediation: finding.remediation,
            severity: finding.severity,
        }));
        const remediation = [...new Set(result.remediation)];
        const summary = safeToShare
            ? "No sensitive metadata found. The file is safe to share."
            : `${findings.length} privacy issue(s) found. Review the remediation steps before sharing.`;
        return new ShareCheckViewModel({
            fileName: result.fileName,
            safeToShare,
            findings,
            redactionRequired,
            remediation,
            summary,
            summaryCode: safeToShare
                ? RESULT_CODES.PRIVACY_VIEW_SAFE
                : RESULT_CODES.PRIVACY_VIEW_ISSUES,
        });
    }
}
