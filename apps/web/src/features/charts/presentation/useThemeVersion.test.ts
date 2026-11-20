import { afterEach, describe, expect, it, vi } from "vitest";
import { observeTheme } from "./useThemeVersion";

describe("observeTheme", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("watches the root data-theme attribute and disconnects on cleanup", () => {
        const captured: { callback: MutationCallback | null } = { callback: null };
        const observe = vi.fn();
        const disconnect = vi.fn();
        class FakeObserver {
            public constructor(listener: MutationCallback) {
                captured.callback = listener;
            }
            public observe = observe;
            public disconnect = disconnect;
        }
        vi.stubGlobal("MutationObserver", FakeObserver);
        const root = {} as HTMLElement;
        vi.stubGlobal("document", { documentElement: root });

        const cleanup = observeTheme(() => undefined);

        expect(observe).toHaveBeenCalledWith(root, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });
        captured.callback?.([], {} as MutationObserver);
        cleanup();
        expect(disconnect).toHaveBeenCalledOnce();
    });

    it("does nothing when MutationObserver is unavailable", () => {
        vi.stubGlobal("MutationObserver", undefined);
        expect(() => observeTheme(() => undefined)()).not.toThrow();
    });
});
