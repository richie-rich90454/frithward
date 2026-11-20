import type { CreateCaseInput } from "@frithward/contracts";
import type { EvidenceItem } from "./controllers/IncidentTimelineController";

const EVIDENCE_LIMITATION =
    "The hash confirms these bytes at collection time; it does not verify the file's origin or contents.";

function titleFor(item: EvidenceItem, report: unknown): string {
    const details =
        report && typeof report === "object" ? (report as Record<string, unknown>) : null;
    const id = typeof details?.id === "string" ? details.id.trim() : "";
    const description = typeof details?.description === "string" ? details.description.trim() : "";
    return id || description || item.source.trim() || item.fileName;
}

/** Maps a collected evidence item into a case, reusing the controller's SHA-256. */
export function evidenceToCaseInput(item: EvidenceItem, report: unknown = null): CreateCaseInput {
    return {
        kind: "evidence",
        title: titleFor(item, report),
        inputs: { fileName: item.fileName, source: item.source, collectedAt: item.collectedAt },
        findings: [],
        limitations: [EVIDENCE_LIMITATION],
        artifacts: [{ kind: "evidence", name: item.fileName, hash: item.sha256 }],
        nextSteps: [],
    };
}
