import type { CreateCaseInput } from "@frithward/contracts";
import type { CheckResultSnapshot } from "./controllers/ScamCheckController";

const TITLE_MAX_LENGTH = 80;

function titleFrom(input: string): string {
    const trimmed = input.trim();
    return trimmed.length > TITLE_MAX_LENGTH ? `${trimmed.slice(0, TITLE_MAX_LENGTH)}…` : trimmed;
}

/** Maps the controller's self-contained snapshot into a storable case. */
export function checkResultToCaseInput(result: CheckResultSnapshot): CreateCaseInput {
    const findings =
        result.channel === "message"
            ? (result.analysis?.indicators ?? [])
            : result.channel === "url"
              ? (result.urlView?.findings ?? [])
              : (result.qrView?.findings ?? []);
    return {
        kind: result.channel,
        title: titleFrom(result.input),
        inputs: { channel: result.channel, input: result.input },
        findings: findings.map((finding) => ({
            label: finding.label,
            severity: finding.severity,
            detail: finding.detail,
        })),
        nextSteps: result.analysis ? [...result.analysis.nextSteps] : [],
        limitations: [...result.limitations],
    };
}
