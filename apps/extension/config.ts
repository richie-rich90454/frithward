/** Web-app origin; override with VITE_FRITHWARD_WEB_URL at build time for a real deployment. */
const configuredUrl =
    typeof import.meta !== "undefined" &&
    typeof import.meta.env?.VITE_FRITHWARD_WEB_URL === "string"
        ? import.meta.env.VITE_FRITHWARD_WEB_URL.trim()
        : "";

export const WEB_APP_URL = configuredUrl || "http://localhost:4173";

/** browser.storage.local key holding the recent-check list. */
export const RECENT_CHECKS_KEY = "frithward.recentChecks";

export const MAX_RECENT_CHECKS = 20;

/** Mirrors the web engine's analysis limit. */
export const ANALYSIS_LIMIT = 20000;

export function buildCheckUrl(text: string): string {
    const base = WEB_APP_URL.replace(/\/+$/, "");
    return `${base}/check#text=${encodeURIComponent(text.slice(0, ANALYSIS_LIMIT))}`;
}
