import { test, expect } from "@playwright/test";

test("home renders wordmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Frithward")).toBeVisible();
});
