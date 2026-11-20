import type { Case, CreateCaseInput, UpdateCaseInput } from "@frithward/contracts";

export interface CaseStore {
    create(input: CreateCaseInput): Promise<Case>;
    get(id: string): Promise<Case | null>;
    list(): Promise<readonly Case[]>;
    update(id: string, input: UpdateCaseInput): Promise<Case | null>;
    remove(id: string): Promise<boolean>;
    close(): Promise<void>;
}
