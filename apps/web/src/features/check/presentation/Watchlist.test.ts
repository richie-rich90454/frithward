import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Watchlist.tsx", import.meta.url), "utf8");

describe("Watchlist markup", () => {
    it("opens a pre-filled check link and records the recheck time", () => {
        expect(source).toContain("navigate(`/check#text=${encodeURIComponent(entry.label)}`)");
        expect(source).toContain("lastCheckedAt: new Date().toISOString()");
        expect(source).toContain("saveWatchlist(next)");
    });

    it("uses the versioned store with an empty state and translated UI", () => {
        expect(source).toContain("loadWatchlist()");
        expect(source).toContain("addToWatchlist(entry)");
        expect(source).toContain("removeFromWatchlist(id)");
        expect(source).toContain('t("watchlist.empty")');
        expect(source).toContain('t("watchlist.lastChecked")');
        expect(source).toContain('import "./watchlist.css"');
    });
});
