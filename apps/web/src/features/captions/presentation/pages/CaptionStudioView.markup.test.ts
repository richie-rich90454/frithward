import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The shared vitest config only includes *.test.ts and does not load vite-plugin-solid,
// so the .tsx view cannot be rendered in a unit test without touching global config.
// These checks read the component source to lock down the markup-level contracts.
const source = readFileSync(new URL("./CaptionStudioView.tsx", import.meta.url), "utf8");

describe("CaptionStudioView markup", () => {
    it("accepts audio and video in the file picker", () => {
        expect(source).toContain('accept="audio/*,video/*"');
    });

    it("offers a microphone capture input alongside the file picker", () => {
        expect(source.match(/type="file"/g)).toHaveLength(2);
        expect(source).toContain('const microphoneCapture = "microphone"');
        expect(source).toContain("capture={microphoneCapture}");
    });

    it("registers and cleans up the global keydown handler", () => {
        expect(source).toContain('window.addEventListener("keydown", onKeyDown)');
        expect(source).toContain('window.removeEventListener("keydown", onKeyDown)');
        expect(source).toContain("onCleanup(");
    });

    it("shows the keyboard shortcut hint", () => {
        expect(source).toContain('t("captions.shortcuts")');
    });
});
