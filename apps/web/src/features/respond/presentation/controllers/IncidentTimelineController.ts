import { english, interpolate, type Translator } from "../../../../i18n/translate.js";

/**
 * Local structural type for the JSON downloaded from /check.
 * Declared here so the respond feature does not import from features/check.
 */
export interface ImportedScamReport {
    id: string;
    channel: string;
    description: string;
    source: string;
    evidenceSha256: string;
    reportedAt: string;
    status: string;
}

function isImportedScamReport(value: unknown): value is ImportedScamReport {
    if (typeof value !== "object" || value === null) return false;
    const report = value as Record<string, unknown>;
    return (
        typeof report["id"] === "string" &&
        report["id"].trim().length > 0 &&
        typeof report["channel"] === "string" &&
        typeof report["description"] === "string" &&
        typeof report["source"] === "string" &&
        typeof report["evidenceSha256"] === "string" &&
        typeof report["reportedAt"] === "string" &&
        typeof report["status"] === "string"
    );
}

export interface IncidentTimelineEntry {
    id: string;
    title: string;
    detail: string;
}

export interface EvidenceItem {
    id: string;
    fileName: string;
    sha256: string;
    collectedAt: string;
    source: string;
}

export interface EvidenceInput {
    fileName: string;
    content: ArrayBuffer;
    source: string;
    collectedAt?: string;
}

export interface ReportHistoryEntry {
    id: string;
    createdAt: string;
    summary: string;
    sha256: string;
}

export interface HistoryStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface IncidentTimelineControllerOptions {
    storage?: HistoryStorage;
    translate?: Translator;
}

const HISTORY_KEY = "frithward.report-history";

function isReportHistoryEntry(value: unknown): value is ReportHistoryEntry {
    if (typeof value !== "object" || value === null) return false;
    const entry = value as Record<string, unknown>;
    return (
        typeof entry["id"] === "string" &&
        typeof entry["createdAt"] === "string" &&
        typeof entry["summary"] === "string" &&
        typeof entry["sha256"] === "string"
    );
}

function readHistory(storage: HistoryStorage | null): ReportHistoryEntry[] {
    if (!storage) return [];
    try {
        const raw = storage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isReportHistoryEntry) : [];
    } catch {
        return [];
    }
}

function browserStorage(): HistoryStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

function toHex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class IncidentTimelineController {
    private readonly storage: HistoryStorage | null;
    private readonly translate: Translator;
    private readonly listeners = new Set<() => void>();
    private entries: IncidentTimelineEntry[] = [];
    private evidence: EvidenceItem[] = [];
    private history: ReportHistoryEntry[];
    private error: string | null = null;

    public constructor(options: IncidentTimelineControllerOptions = {}) {
        this.storage = options.storage ?? browserStorage();
        this.translate = options.translate ?? english;
        this.history = readHistory(this.storage);
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getEntries(): readonly IncidentTimelineEntry[] {
        return this.entries;
    }

    public getEvidence(): readonly EvidenceItem[] {
        return this.evidence;
    }

    public getReportHistory(): readonly ReportHistoryEntry[] {
        return this.history;
    }

    public getError(): string | null {
        return this.error;
    }

    // Analysis lives in the check feature; importing its report is the supported path.
    public analyze(input: { text: string; receivedAt: string }): void {
        if (input.text.trim().length === 0) {
            this.error = this.translate("respond.error.messageRequired");
            this.notify();
            return;
        }
        this.entries = [
            {
                id: "received",
                title: this.translate("respond.entry.messageRecorded"),
                detail: input.receivedAt,
            },
            {
                id: "message",
                title: this.translate("respond.entry.messageText"),
                detail: input.text,
            },
        ];
        this.error = null;
        this.notify();
    }

    public async importScamReport(input: {
        fileName: string;
        content: ArrayBuffer;
        report: unknown;
    }): Promise<EvidenceItem> {
        if (!isImportedScamReport(input.report))
            throw new Error(this.translate("respond.error.invalidReport"));
        const report = input.report;
        const item = await this.addEvidence({
            fileName: input.fileName,
            content: input.content,
            source: this.translate("respond.source.scamReport"),
        });
        this.entries = [
            ...this.entries,
            {
                id: `report-${report.id}`,
                title: this.translate("respond.entry.reportImported"),
                detail: `${report.id} | ${report.reportedAt} | ${report.status}`,
            },
        ];
        this.notify();
        return item;
    }

    public async addEvidence(input: EvidenceInput): Promise<EvidenceItem> {
        const subtle = globalThis.crypto?.subtle;
        if (!subtle) throw new Error(this.translate("respond.error.hashUnavailable"));
        if (input.fileName.trim().length === 0)
            throw new Error(this.translate("respond.error.fileNameRequired"));
        if (input.source.trim().length === 0)
            throw new Error(this.translate("respond.error.sourceRequired"));

        const digest = await subtle.digest("SHA-256", input.content);
        const item: EvidenceItem = {
            id: globalThis.crypto.randomUUID(),
            fileName: input.fileName.trim(),
            sha256: toHex(digest),
            collectedAt: input.collectedAt ?? new Date().toISOString(),
            source: input.source.trim(),
        };
        this.evidence = [...this.evidence, item].sort((a, b) =>
            a.collectedAt.localeCompare(b.collectedAt),
        );
        this.error = null;
        this.notify();
        return item;
    }

    public buildEvidenceReport(): string {
        return JSON.stringify(this.evidence, null, 2);
    }

    public async exportReport(): Promise<string> {
        if (this.evidence.length === 0) throw new Error(this.translate("respond.error.noEvidence"));
        const subtle = globalThis.crypto?.subtle;
        if (!subtle) throw new Error(this.translate("respond.error.hashUnavailable"));
        const json = this.buildEvidenceReport();
        const digest = await subtle.digest("SHA-256", new TextEncoder().encode(json));
        const entry: ReportHistoryEntry = {
            id: globalThis.crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            summary: interpolate(this.translate("respond.summary.itemsRecorded"), {
                n: this.evidence.length,
            }),
            sha256: toHex(digest),
        };
        this.history = [...this.history, entry];
        try {
            this.storage?.setItem(HISTORY_KEY, JSON.stringify(this.history));
        } catch {
            this.error = this.translate("respond.error.historySave");
        }
        this.notify();
        return json;
    }

    public reset(): void {
        this.entries = [];
        this.evidence = [];
        this.error = null;
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
