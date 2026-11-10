import { AppError } from "@frithward/contracts";
import type {
    MetadataFinding,
    MetadataFindingKind,
    MetadataPayload,
} from "../domain/MetadataFinding.js";
import { PiiRedactionPolicy } from "../domain/PiiRedactionPolicy.js";
import type { RedactionRegion } from "../domain/RedactionRegion.js";

export interface SanitizationAction {
    kind: MetadataFindingKind | "strip-metadata";
    description: string;
}

export interface SanitizedOutputDescriptor {
    outputId: string;
    fileName: string;
    actions: readonly SanitizationAction[];
    redactionRegions: readonly RedactionRegion[];
    safeToShare: boolean;
    summary: string;
}

export class SanitizedExportUseCase {
    private readonly policy: PiiRedactionPolicy;

    public constructor(policy?: PiiRedactionPolicy) {
        this.policy = policy ?? new PiiRedactionPolicy();
    }

    public execute(input: {
        payload: MetadataPayload;
        findings: readonly MetadataFinding[];
        regions?: readonly RedactionRegion[];
    }): SanitizedOutputDescriptor {
        if (input.payload.fileName.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "File name required.");

        const regions = input.regions ?? [];
        const requiresRedaction = this.policy.requiresRedaction(input.findings);
        const actions: SanitizationAction[] = [];
        const stripKinds = new Set<MetadataFindingKind>();

        for (const finding of input.findings) {
            if (!this.policy.requiresRedaction([finding])) continue;
            const region = regions.find((candidate) => candidate.kind === finding.kind);
            if (region) {
                actions.push({
                    kind: finding.kind,
                    description: `Redact the ${finding.kind} area at (${region.x.toFixed(2)}, ${region.y.toFixed(2)}) before sharing.`,
                });
            } else {
                stripKinds.add(finding.kind);
                actions.push({ kind: finding.kind, description: finding.remediation });
            }
        }
        if (stripKinds.size > 0) {
            actions.push({
                kind: "strip-metadata",
                description: "Strip identifying metadata from the exported file.",
            });
        }

        const safeToShare = !requiresRedaction;
        const summary = safeToShare
            ? "No redaction required; the file is safe to share."
            : `${actions.length} sanitization action(s) required before sharing.`;

        return {
            outputId: globalThis.crypto.randomUUID(),
            fileName: input.payload.fileName,
            actions,
            redactionRegions: [...regions],
            safeToShare,
            summary,
        };
    }
}
