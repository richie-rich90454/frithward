import type { Case } from "@frithward/contracts";

/** Storage boundary for investigation cases. */
export interface CaseRepositoryPort {
    list(): Promise<readonly Case[]>;
    get(id: string): Promise<Case | null>;
    save(caseRecord: Case): Promise<void>;
    remove(id: string): Promise<void>;
    clear?(): Promise<void>;
}
