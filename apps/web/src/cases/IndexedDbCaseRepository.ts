import { Case as CaseSchema, type Case, type CreateCaseInput } from "@frithward/contracts";
import Dexie, { type EntityTable } from "dexie";

/** Storage boundary for investigation cases; matches the ports package structurally. */
export interface CaseStore {
    list(): Promise<readonly Case[]>;
    get(id: string): Promise<Case | null>;
    save(caseRecord: Case): Promise<void>;
    remove(id: string): Promise<void>;
    clear?(): Promise<void>;
}

const DATABASE_NAME = "frithward-cases";
const STORE_NAME = "cases";

class CaseDatabase extends Dexie {
    cases!: EntityTable<Case, "id">;

    constructor() {
        super(DATABASE_NAME);
        this.version(1).stores({ [STORE_NAME]: "id, updatedAt" });
    }
}

let database: CaseDatabase | undefined;

function getDatabase(): CaseDatabase {
    if (typeof indexedDB === "undefined") {
        throw new Error(
            "IndexedDB is not available; cases cannot be persisted in this environment.",
        );
    }
    if (!database) {
        database = new CaseDatabase();
    }
    return database;
}

export function createCaseId(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
        const random = (Math.random() * 16) | 0;
        const value = character === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

export function normalizeCase(
    input: CreateCaseInput | Case,
    now: string = new Date().toISOString(),
): Case {
    return CaseSchema.parse({
        id: createCaseId(),
        createdAt: now,
        updatedAt: now,
        findings: [],
        artifacts: [],
        nextSteps: [],
        limitations: [],
        status: "draft",
        ...input,
    });
}

export class IndexedDbCaseRepository implements CaseStore {
    async list(): Promise<Case[]> {
        const rows = await getDatabase().cases.orderBy("updatedAt").reverse().toArray();
        return rows.map((row) => CaseSchema.parse(row));
    }

    async get(id: string): Promise<Case | null> {
        const row = await getDatabase().cases.get(id);
        return row ? CaseSchema.parse(row) : null;
    }

    async save(caseRecord: Case): Promise<void> {
        await getDatabase().cases.put(CaseSchema.parse(caseRecord));
    }

    async remove(id: string): Promise<void> {
        await getDatabase().cases.delete(id);
    }

    async clear(): Promise<void> {
        await getDatabase().cases.clear();
    }
}

/** Deterministic in-memory implementation for tests and environments without IndexedDB. */
export class InMemoryCaseRepository implements CaseStore {
    private readonly records = new Map<string, Case>();

    async list(): Promise<Case[]> {
        return [...this.records.values()].sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
        );
    }

    async get(id: string): Promise<Case | null> {
        return this.records.get(id) ?? null;
    }

    async save(caseRecord: Case): Promise<void> {
        const record = normalizeCase(caseRecord);
        this.records.set(record.id, record);
    }

    async remove(id: string): Promise<void> {
        this.records.delete(id);
    }

    async clear(): Promise<void> {
        this.records.clear();
    }
}
