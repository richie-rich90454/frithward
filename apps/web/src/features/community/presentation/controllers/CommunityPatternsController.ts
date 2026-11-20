export const COMMUNITY_PATTERNS_KEY = "frithward.community.patterns";
const VERSION = 1;

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 600;
export const SOURCE_URL_MAX = 500;

export interface CommunityPattern {
    id: string;
    title: string;
    description: string;
    sourceUrl: string | null;
    createdAt: string;
}

export interface CommunityPatternInput {
    title: string;
    description: string;
    sourceUrl?: string;
}

export interface CommunityPatternsState {
    patterns: readonly CommunityPattern[];
    error: string | null;
}

export interface CommunityStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export interface CommunityControllerOptions {
    storage?: CommunityStorage | null;
}

/** Returns an error message, or null when the input is acceptable. */
export function validatePatternInput(input: CommunityPatternInput): string | null {
    const title = input.title.trim();
    const description = input.description.trim();
    const sourceUrl = (input.sourceUrl ?? "").trim();
    if (title.length === 0) return "A title is required.";
    if (title.length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
    if (description.length === 0) return "A description is required.";
    if (description.length > DESCRIPTION_MAX)
        return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
    if (sourceUrl.length > SOURCE_URL_MAX)
        return `Source URL must be ${SOURCE_URL_MAX} characters or fewer.`;
    return null;
}

function isCommunityPattern(value: unknown): value is CommunityPattern {
    if (typeof value !== "object" || value === null) return false;
    const entry = value as Record<string, unknown>;
    return (
        typeof entry["id"] === "string" &&
        typeof entry["title"] === "string" &&
        entry["title"].trim().length > 0 &&
        typeof entry["description"] === "string" &&
        entry["description"].trim().length > 0 &&
        (entry["sourceUrl"] === null || typeof entry["sourceUrl"] === "string") &&
        typeof entry["createdAt"] === "string"
    );
}

function readPatterns(storage: CommunityStorage | null): CommunityPattern[] {
    if (!storage) return [];
    try {
        const raw = storage.getItem(COMMUNITY_PATTERNS_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return [];
        const candidate = parsed as { version?: unknown; patterns?: unknown };
        if (candidate.version !== VERSION || !Array.isArray(candidate.patterns)) return [];
        return candidate.patterns.filter(isCommunityPattern);
    } catch {
        return [];
    }
}

function browserStorage(): CommunityStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

function nextId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Best-effort, local-only pattern notebook. Entries stay in this browser and are
 * never uploaded or shared; nothing here claims independent verification.
 */
export class CommunityPatternsController {
    private readonly storage: CommunityStorage | null;
    private readonly listeners = new Set<() => void>();
    private patterns: CommunityPattern[];
    private error: string | null = null;

    public constructor(options: CommunityControllerOptions = {}) {
        this.storage = options.storage ?? browserStorage();
        this.patterns = readPatterns(this.storage);
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getState(): CommunityPatternsState {
        return { patterns: this.patterns, error: this.error };
    }

    public add(input: CommunityPatternInput): boolean {
        const error = validatePatternInput(input);
        if (error !== null) {
            this.error = error;
            this.notify();
            return false;
        }
        const entry: CommunityPattern = {
            id: nextId(),
            title: input.title.trim(),
            description: input.description.trim(),
            sourceUrl: (input.sourceUrl ?? "").trim() || null,
            createdAt: new Date().toISOString(),
        };
        this.patterns = [entry, ...this.patterns];
        this.error = null;
        this.save();
        this.notify();
        return true;
    }

    public remove(id: string): void {
        this.patterns = this.patterns.filter((pattern) => pattern.id !== id);
        this.save();
        this.notify();
    }

    private save(): void {
        if (!this.storage) return;
        try {
            this.storage.setItem(
                COMMUNITY_PATTERNS_KEY,
                JSON.stringify({ version: VERSION, patterns: this.patterns }),
            );
        } catch {
            // Ignored: the notebook is a convenience, not a guarantee.
        }
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
