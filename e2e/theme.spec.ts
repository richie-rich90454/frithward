import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "frithward.theme";
const TOGGLE = '[data-testid="theme-toggle"]';
const ROOT = "html";

async function clickUntil(page: Page, target: "system" | "light" | "dark"): Promise<void> {
    const toggle = page.locator(TOGGLE);
    for (let i = 0; i < 4; i += 1) {
        if ((await toggle.getAttribute("data-theme-value")) === target) return;
        await toggle.click();
    }
    throw new Error(`theme toggle never reached "${target}"`);
}

test("theme toggle cycles, persists, and follows prefers-color-scheme", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();

    // Fresh context: light is the default effective theme.
    await expect(page.locator(ROOT)).not.toHaveAttribute("data-theme", "dark");

    await clickUntil(page, "dark");
    await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toContain("dark");

    await page.reload();
    await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");

    await clickUntil(page, "light");
    await expect(page.locator(ROOT)).not.toHaveAttribute("data-theme");

    await clickUntil(page, "system");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator(ROOT)).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(ROOT)).not.toHaveAttribute("data-theme");
});

const OVERFLOW_ROUTES = [
    "/",
    "/check",
    "/protect",
    "/tools/captions",
    "/tools/documents",
    "/respond",
] as const;

for (const route of OVERFLOW_ROUTES) {
    test(`no horizontal overflow on ${route} at 375px`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto(route);

        const width = await page.evaluate(() => {
            const root = document.documentElement;
            return { scroll: root.scrollWidth, client: root.clientWidth };
        });
        expect(
            width.scroll,
            `${route}: scrollWidth ${width.scroll} exceeds clientWidth ${width.client}`,
        ).toBeLessThanOrEqual(width.client);
    });
}

test("home buttons meet the 44px touch target at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const buttons = page.locator("button");
    const count = await buttons.count();
    expect(count, "home has no buttons").toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
        const button = buttons.nth(i);
        if (!(await button.isVisible())) continue;
        const box = await button.boundingBox();
        if (!box) continue;
        expect(box.height, `button ${i} is only ${box.height}px tall`).toBeGreaterThanOrEqual(43);
    }
});
