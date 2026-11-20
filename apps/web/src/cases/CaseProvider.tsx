import {
    createContext,
    createMemo,
    createSignal,
    onMount,
    useContext,
    type Accessor,
    type ParentProps,
} from "solid-js";
import type { Case, CreateCaseInput } from "@frithward/contracts";
import {
    IndexedDbCaseRepository,
    normalizeCase,
    type CaseStore,
} from "./IndexedDbCaseRepository.js";

export interface CasesContextValue {
    cases: Accessor<Case[]>;
    recent: Accessor<Case[]>;
    error: Accessor<string | null>;
    getCase: (id: string) => Case | undefined;
    saveCase: (input: CreateCaseInput | Case) => Promise<Case>;
    removeCase: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const RECENT_LIMIT = 8;

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unable to access case storage.";
}

export const CasesContext = createContext<CasesContextValue>();

export function CaseProvider(props: ParentProps<{ repository?: CaseStore }>) {
    const repository = props.repository ?? new IndexedDbCaseRepository();
    const [cases, setCases] = createSignal<Case[]>([]);
    const [error, setError] = createSignal<string | null>(null);
    const recent = createMemo(() => cases().slice(0, RECENT_LIMIT));

    const refresh = async (): Promise<void> => {
        setError(null);
        try {
            setCases([...(await repository.list())]);
        } catch (cause) {
            setError(errorMessage(cause));
        }
    };

    onMount(() => {
        void refresh();
    });

    const value: CasesContextValue = {
        cases,
        recent,
        error,
        getCase: (id) => cases().find((record) => record.id === id),
        saveCase: async (input) => {
            const record = normalizeCase(input);
            await repository.save(record);
            await refresh();
            return record;
        },
        removeCase: async (id) => {
            await repository.remove(id);
            await refresh();
        },
        refresh,
    };

    return <CasesContext.Provider value={value}>{props.children}</CasesContext.Provider>;
}

export function useCases(): CasesContextValue {
    const context = useContext(CasesContext);
    if (!context) throw new Error("useCases must be used inside CaseProvider.");
    return context;
}
