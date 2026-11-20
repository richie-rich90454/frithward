import type { Case, CreateCaseInput } from "@frithward/contracts";
import type {
    MetadataInspectionView,
    RedactionResultView,
} from "./controllers/ShareCheckController";

const METADATA_LIMITATION =
    "Embedded metadata inspection is partial; a clean result does not prove the file is safe to share.";
const REDACTION_LIMITATION =
    "The rebuilt copy removes embedded metadata, but the decoded image content was not reviewed.";
const UNKNOWN_FORMAT_LIMITATION =
    "This file format was not inspected; no embedded metadata could be verified.";

export function metadataInspectionToCaseInput(view: MetadataInspectionView): CreateCaseInput {
    return {
        kind: "file",
        title: view.fileName,
        inputs: { fileName: view.fileName, format: view.format },
        findings: view.issues.map((issue) => ({
            label: issue.label,
            severity: issue.severity,
            detail: issue.why,
        })),
        limitations: [view.format === "unknown" ? UNKNOWN_FORMAT_LIMITATION : METADATA_LIMITATION],
        artifacts: [{ kind: "metadata", name: view.fileName }],
        nextSteps: [...view.remediation],
    };
}

export function redactionCaseInput(
    redaction: RedactionResultView,
    existing: Case | null = null,
): CreateCaseInput | Case {
    const artifact = { kind: "redacted-file", name: redaction.artifact.fileName };
    if (existing) {
        return {
            ...existing,
            artifacts: [...existing.artifacts, artifact],
        };
    }
    return {
        kind: "file",
        title: redaction.artifact.fileName,
        inputs: { fileName: redaction.artifact.fileName },
        findings: redaction.remaining.map((finding) => ({
            label: finding.kind,
            severity: "medium" as const,
            detail: finding.detail,
        })),
        limitations: [REDACTION_LIMITATION],
        artifacts: [artifact],
        nextSteps: [],
    };
}
