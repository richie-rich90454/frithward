import { afterEach, describe, expect, it, vi } from "vitest";
import { getIsolationStatus } from "./isolation";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getIsolationStatus", () => {
    it("reports isolated when both signals are present", () => {
        vi.stubGlobal("crossOriginIsolated", true);
        vi.stubGlobal("SharedArrayBuffer", class {});
        expect(getIsolationStatus()).toEqual({ isolated: true, missing: [] });
    });

    it("reports missing isolation headers when crossOriginIsolated is false", () => {
        vi.stubGlobal("crossOriginIsolated", false);
        vi.stubGlobal("SharedArrayBuffer", class {});
        const status = getIsolationStatus();
        expect(status.isolated).toBe(false);
        expect(status.missing).toContain("cross-origin isolation (COOP/COEP headers)");
    });

    it("reports a missing SharedArrayBuffer global", () => {
        vi.stubGlobal("crossOriginIsolated", true);
        vi.stubGlobal("SharedArrayBuffer", undefined);
        const status = getIsolationStatus();
        expect(status.isolated).toBe(false);
        expect(status.missing).toContain("SharedArrayBuffer");
    });

    it("reports both missing when neither signal is present", () => {
        vi.stubGlobal("crossOriginIsolated", false);
        vi.stubGlobal("SharedArrayBuffer", undefined);
        expect(getIsolationStatus()).toEqual({
            isolated: false,
            missing: ["cross-origin isolation (COOP/COEP headers)", "SharedArrayBuffer"],
        });
    });
});
