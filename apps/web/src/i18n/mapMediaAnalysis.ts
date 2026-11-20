import { resultList, resultText } from "./results.js";
import type { Translator } from "./translate.js";

/** Structural shape shared by media-analysis results in the web layer. */
export interface CodedTextResult {
    summary: string;
    summaryCode?: string | undefined;
    summaryParams?: Readonly<Record<string, string | number>> | undefined;
    limitations: readonly string[];
    limitationCodes?: readonly (string | undefined)[] | undefined;
    nextSteps: readonly string[];
    nextStepCodes?: readonly (string | undefined)[] | undefined;
}

export interface TranslatedTextResult {
    summary: string;
    limitations: readonly string[];
    nextSteps: readonly string[];
}

/**
 * Translate the English summary, limitations and next steps produced by
 * media-analysis packages using the codes carried alongside each string.
 */
export function translateMediaAnalysisText(
    t: Translator,
    result: CodedTextResult,
): TranslatedTextResult {
    return {
        summary: resultText(t, result.summary, result.summaryCode, result.summaryParams),
        limitations: resultList(t, result.limitations, result.limitationCodes),
        nextSteps: resultList(t, result.nextSteps, result.nextStepCodes),
    };
}
