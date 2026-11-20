/** Default web-app origin. Override per environment when documenting deployment. */
export const WEB_APP_URL = "http://localhost:4173";

/** browser.storage.local key holding the recent-check list. */
export const RECENT_CHECKS_KEY = "frithward.recentChecks";

export const MAX_RECENT_CHECKS = 20;

/** Mirrors the web engine's analysis limit. */
export const ANALYSIS_LIMIT = 20000;

export function buildCheckUrl(text: string): string {
    const base = WEB_APP_URL.replace(/\/+$/, "");
    return `${base}/check#text=${encodeURIComponent(text.slice(0, ANALYSIS_LIMIT))}`;
}
