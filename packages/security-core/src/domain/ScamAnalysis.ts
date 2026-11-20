import { RESULT_CODES, resultCodeForText, ScamIndicator } from "@frithward/contracts";

export class ScamAnalysis {
    public readonly indicators: readonly ScamIndicator[];
    public readonly summary: string;
    public readonly nextSteps: readonly string[];
    public readonly limitations: readonly string[];
    public readonly summaryCode: string;
    public readonly limitationCodes: readonly (string | undefined)[];

    public constructor(indicators: readonly ScamIndicator[]) {
        this.indicators = indicators;
        this.summary = indicators.length
            ? `${indicators.length} risk indicator(s) found. This does not establish fraud.`
            : "No text risk indicators found.";
        this.nextSteps = [
            "Contact the person through a known channel to confirm the request.",
            "Do not send money, codes, or credentials.",
            "Keep the original message as evidence.",
        ];
        this.limitations = [
            "Text patterns alone cannot prove intent.",
            "Related URLs, images, and callers were not checked.",
        ];
        this.summaryCode = resultCodeForText(this.summary) ?? RESULT_CODES.SCAM_SUMMARY_FOUND;
        this.limitationCodes = this.limitations.map(resultCodeForText);
    }
}
