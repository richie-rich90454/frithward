import { describe, expect, it } from "vitest";
import { isCrossOriginIsolationAvailable } from "./whisper-support.js";

describe("isCrossOriginIsolationAvailable", () => {
    it("returns true when SharedArrayBuffer exists and the page is isolated", () => {
        expect(
            isCrossOriginIsolationAvailable({
                SharedArrayBuffer: class {},
                crossOriginIsolated: true,
            }),
        ).toBe(true);
    });

    it("returns false when SharedArrayBuffer is missing", () => {
        expect(isCrossOriginIsolationAvailable({ crossOriginIsolated: true })).toBe(false);
    });

    it("returns false when crossOriginIsolated is false", () => {
        expect(
            isCrossOriginIsolationAvailable({
                SharedArrayBuffer: class {},
                crossOriginIsolated: false,
            }),
        ).toBe(false);
    });

    it("returns false when crossOriginIsolated is missing", () => {
        expect(isCrossOriginIsolationAvailable({ SharedArrayBuffer: class {} })).toBe(false);
    });
});
