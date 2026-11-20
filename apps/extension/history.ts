import { browser } from "wxt/browser";
import { MAX_RECENT_CHECKS, RECENT_CHECKS_KEY } from "./config";
import type { Severity } from "./analysis";

export interface RecentCheck {
    id: string;
    at: string;
    source: "page" | "selection";
    url: string;
    textLength: number;
    summary: string;
    findingCount: number;
    topSeverity: Severity | "none";
}

export async function loadRecentChecks(): Promise<RecentCheck[]> {
    try {
        const stored = await browser.storage.local.get(RECENT_CHECKS_KEY);
        const value = stored[RECENT_CHECKS_KEY];
        return Array.isArray(value) ? (value as RecentCheck[]).slice(0, MAX_RECENT_CHECKS) : [];
    } catch {
        return [];
    }
}

export async function addRecentCheck(entry: RecentCheck): Promise<RecentCheck[]> {
    const next = [entry, ...(await loadRecentChecks())].slice(0, MAX_RECENT_CHECKS);
    try {
        await browser.storage.local.set({ [RECENT_CHECKS_KEY]: next });
    } catch {
        // Storage may be blocked; keep the in-memory list for this session.
    }
    return next;
}

export async function clearRecentChecks(): Promise<RecentCheck[]> {
    try {
        await browser.storage.local.remove(RECENT_CHECKS_KEY);
    } catch {
        // Storage may be blocked; the in-memory list is still cleared below.
    }
    return [];
}
