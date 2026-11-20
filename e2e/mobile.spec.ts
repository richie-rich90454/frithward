import { expect, test } from "@playwright/test";

const ROUTES = [
    "/",
    "/make",
    "/protect",
    "/check",
    "/verify",
    "/respond",
    "/learn",
    "/community",
    "/tools",
    "/tools/captions",
    "/tools/documents",
    "/tools/diagrams",
    "/tools/charts",
    "/tools/runtime",
    "/tools/models",
] as const;

test.use({ viewport: { width: 375, height: 812 } });

for (const route of ROUTES) {
    test(`mobile ${route}: stable layout and reachable theme toggle`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));

        await page.goto(route);
        await page.locator("h1").first().waitFor();

        const fits = await page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth <= root.clientWidth;
        });
        expect(fits, `${route} overflows horizontally at 375px`).toBe(true);

        const toggle = page.getByTestId("theme-toggle");
        await expect(toggle).toBeVisible();
        const box = await toggle.boundingBox();
        expect(box, "theme toggle has no bounding box").not.toBeNull();
        if (box) {
            expect(box.width).toBeGreaterThan(0);
            expect(box.height).toBeGreaterThan(0);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(375);
        }

        expect(errors, `${route} raised page errors: ${errors.join(" | ")}`).toEqual([]);
    });
}
