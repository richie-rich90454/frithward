// @vitest-environment jsdom
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import axe from "axe-core";
import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { en } from "../../../locales/en.js";

vi.mock("solid-js/web", async () => {
    const client = pathToFileURL(
        resolve(process.cwd(), "node_modules/solid-js/web/dist/web.js"),
    ).href;
    return import(/* @vite-ignore */ client);
});

function LocalizedShell() {
    const heading = document.createElement("h1");
    heading.textContent = en["check.title"] ?? "Scam check";

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", en["nav.primary"] ?? "Primary");
    for (const key of ["nav.home", "nav.check", "nav.protect", "nav.learn"] as const) {
        const link = document.createElement("a");
        link.href = "/";
        link.textContent = en[key] ?? key;
        nav.append(link);
    }

    const select = document.createElement("select");
    select.setAttribute("aria-label", en.language ?? "Language");
    const option = document.createElement("option");
    option.value = "en";
    option.textContent = "English";
    select.append(option);

    const shell = document.createElement("div");
    shell.append(heading, nav, select);
    return shell;
}

describe("localized shell", () => {
    it("has no serious or critical accessibility violations", async () => {
        const { container } = render(() => LocalizedShell());
        const results = await axe.run(container);
        const severe = results.violations
            .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
            .map((violation) => `${violation.id}: ${violation.help}`);
        expect(severe).toEqual([]);
    });
});
