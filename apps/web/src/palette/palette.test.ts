import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCommandShortcut } from "./shortcut.js";

const source = readFileSync(new URL("./CommandPalette.tsx", import.meta.url), "utf8");

describe("command shortcut", () => {
    it("matches Ctrl+K and Cmd+K only", () => {
        expect(isCommandShortcut({ key: "k", ctrlKey: true, metaKey: false })).toBe(true);
        expect(isCommandShortcut({ key: "K", ctrlKey: false, metaKey: true })).toBe(true);
        expect(isCommandShortcut({ key: "k", ctrlKey: false, metaKey: false })).toBe(false);
        expect(isCommandShortcut({ key: "a", ctrlKey: true, metaKey: false })).toBe(false);
    });
});

describe("CommandPalette markup", () => {
    it("registers and cleans up the keyboard handler", () => {
        expect(source).toContain('window.addEventListener("keydown", onKeyDown)');
        expect(source).toContain('window.removeEventListener("keydown", onKeyDown)');
        expect(source).toContain("isCommandShortcut(event)");
    });

    it("renders an accessible dialog and restores focus on close", () => {
        expect(source).toContain('role="dialog"');
        expect(source).toContain('aria-modal="true"');
        expect(source).toContain('event.key === "Escape"');
        expect(source).toContain("target?.focus()");
        expect(source).toContain("onClick={close}");
    });

    it("links all 15 routes and uses translated labels", () => {
        const paths = source.match(/path: "\//g) ?? [];
        expect(paths).toHaveLength(15);
        expect(source).toContain("useNavigate");
        expect(source).toContain('labelKey: "tools.modelManager"');
        expect(source).toContain('import "./palette.css"');
    });
});
