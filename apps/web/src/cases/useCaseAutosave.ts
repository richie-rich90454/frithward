import { onCleanup } from "solid-js";
import type { Case, CreateCaseInput } from "@frithward/contracts";

export type CaseLike = CreateCaseInput | Case;

export interface CaseAutosave {
    save: (input: CaseLike) => void;
}

export function useCaseAutosave(
    saveCase: (input: CaseLike) => Promise<Case>,
    delayMs = 600,
): CaseAutosave {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const save = (input: CaseLike): void => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            void Promise.resolve(saveCase(input)).catch((error: unknown) => {
                console.error("Case autosave failed", error);
            });
        }, delayMs);
    };

    onCleanup(() => {
        if (timer !== undefined) clearTimeout(timer);
    });

    return { save };
}
