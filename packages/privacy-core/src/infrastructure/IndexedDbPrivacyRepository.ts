import { AppError } from "@frithward/contracts";
import type { PrivacyInspectionRecord, PrivacyRepository } from "../ports/PrivacyRepository.js";

const DEFAULT_DB_NAME = "frithward-privacy";
const STORE_NAME = "inspections";
const DB_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(
                request.error ?? new AppError("EXTERNAL_UNAVAILABLE", "IndexedDB request failed."),
            );
    });
}

export class IndexedDbPrivacyRepository implements PrivacyRepository {
    private readonly dbName: string;
    private dbPromise: Promise<IDBDatabase> | null;

    public constructor(dbName: string = DEFAULT_DB_NAME) {
        this.dbName = dbName;
        this.dbPromise = null;
    }

    public async save(record: PrivacyInspectionRecord): Promise<void> {
        if (record.id.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Inspection id required.");
        if (record.fileName.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "File name required.");
        const db = await this.open();
        const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
        await requestToPromise(store.put(record));
    }

    public async load(id: string): Promise<PrivacyInspectionRecord | null> {
        const db = await this.open();
        const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
        const request = store.get(id) as IDBRequest<PrivacyInspectionRecord | undefined>;
        const record = await requestToPromise(request);
        return record ?? null;
    }

    public async list(): Promise<readonly PrivacyInspectionRecord[]> {
        const db = await this.open();
        const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
        const request = store.getAll() as IDBRequest<PrivacyInspectionRecord[]>;
        const records = await requestToPromise(request);
        return records.slice().sort((a, b) => a.inspectedAt.localeCompare(b.inspectedAt));
    }

    private open(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
                if (typeof indexedDB === "undefined") {
                    reject(
                        new AppError(
                            "EXTERNAL_UNAVAILABLE",
                            "IndexedDB is not available in this environment.",
                        ),
                    );
                    return;
                }
                const request = indexedDB.open(this.dbName, DB_VERSION);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: "id" });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () =>
                    reject(
                        new AppError(
                            "EXTERNAL_UNAVAILABLE",
                            "Failed to open the privacy database.",
                        ),
                    );
            });
        }
        return this.dbPromise;
    }
}
