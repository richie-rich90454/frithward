import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

interface Violation {
    id: string;
    impact: string | null;
    help: string;
}

for (const path of ["/", "/check", "/protect", "/learn"]) {
    test(`no serious or critical accessibility violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate(async (): Promise<Violation[]> => {
            const { axe } = window as unknown as {
                axe: {
                    run: (context: Document) => Promise<{ violations: Violation[] }>;
                };
            };
            const results = await axe.run(document);
            return results.violations.filter(
                (violation) => violation.impact === "serious" || violation.impact === "critical",
            );
        });
        expect(
            violations.map((violation) => `${violation.id}: ${violation.help}`),
        ).toEqual([]);
    });
}

test("language switcher updates document lang and direction", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByLabel("Language").selectOption("ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
