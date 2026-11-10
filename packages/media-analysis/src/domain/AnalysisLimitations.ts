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
