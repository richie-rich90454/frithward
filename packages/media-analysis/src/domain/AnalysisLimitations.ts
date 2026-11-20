/** Stable identifiers for the English limitation strings emitted by analysis packages. */
export const ANALYSIS_LIMITATION_CODES = {
    EVIDENCE: "ANALYSIS_LIMIT_EVIDENCE",
    MODEL_VARIATION: "ANALYSIS_LIMIT_MODEL_VARIATION",
    HUMAN_REVIEW: "ANALYSIS_LIMIT_HUMAN_REVIEW",
    AUDIO: "ANALYSIS_LIMIT_AUDIO",
    IMAGE: "ANALYSIS_LIMIT_IMAGE",
    VIDEO: "ANALYSIS_LIMIT_VIDEO",
    MULTIMODAL: "ANALYSIS_LIMIT_MULTIMODAL",
} as const;

const TEXT_TO_CODE: ReadonlyMap<string, string> = new Map([
    [
        "Detection outputs are evidence for review, not proof of authenticity.",
        ANALYSIS_LIMITATION_CODES.EVIDENCE,
    ],
    [
        "Model performance varies across datasets, languages, and recording conditions.",
        ANALYSIS_LIMITATION_CODES.MODEL_VARIATION,
    ],
    [
        "Consequential decisions require independent human review.",
        ANALYSIS_LIMITATION_CODES.HUMAN_REVIEW,
    ],
    [
        "Single-model audio scores do not establish synthesis or voice conversion.",
        ANALYSIS_LIMITATION_CODES.AUDIO,
    ],
    ["Frame-level image scores do not establish manipulation.", ANALYSIS_LIMITATION_CODES.IMAGE],
    ["Frame sampling can miss brief manipulations.", ANALYSIS_LIMITATION_CODES.VIDEO],
    [
        "Audio-video synchronization signals are sensitive to language and recording quality.",
        ANALYSIS_LIMITATION_CODES.MULTIMODAL,
    ],
]);

export function analysisLimitationCode(text: string): string | undefined {
    return TEXT_TO_CODE.get(text);
}

export class AnalysisLimitations {
    public static readonly base: readonly string[] = Object.freeze([
        "Detection outputs are evidence for review, not proof of authenticity.",
        "Model performance varies across datasets, languages, and recording conditions.",
        "Consequential decisions require independent human review.",
    ]);

    public static forKind(kind: string): readonly string[] {
        const specific: Readonly<Record<string, readonly string[]>> = {
            audio: ["Single-model audio scores do not establish synthesis or voice conversion."],
            image: ["Frame-level image scores do not establish manipulation."],
            video: ["Frame sampling can miss brief manipulations."],
            multimodal: [
                "Audio-video synchronization signals are sensitive to language and recording quality.",
            ],
        };
        return AnalysisLimitations.merge(AnalysisLimitations.base, specific[kind] ?? []);
    }

    public static merge(...groups: readonly (readonly string[])[]): readonly string[] {
        const seen = new Set<string>();
        const merged: string[] = [];
        for (const group of groups) {
            for (const item of group) {
                if (seen.has(item)) continue;
                seen.add(item);
                merged.push(item);
            }
        }
        return merged;
    }
}
