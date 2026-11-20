import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fixture = fileURLToPath(new URL("./fixtures/photo-with-exif.jpg", import.meta.url));

const SCAM_TEXT = "Persisted scam check alpha";
const PHOTO = "photo-with-exif.jpg";
const EVIDENCE_SOURCE = "Persisted evidence source";

for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "desktop", width: 1280, height: 800 },
]) {
    test(`cases and recent checks survive reload at ${viewport.name} width`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize(viewport);

        await page.goto("/check");
        await page.getByLabel("Message text").fill(SCAM_TEXT);
        await page.getByRole("button", { name: "Check message" }).click();
        await expect(page.getByText("Saved to cases")).toBeVisible();

        await page.goto("/protect");
        await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(fixture);
        await expect(page.getByText("Saved to cases")).toBeVisible();

        await page.goto("/respond");
        await page.getByLabel("Evidence file").setInputFiles(fixture);
        await page.getByLabel("Source").fill(EVIDENCE_SOURCE);
        await page.getByRole("button", { name: "Hash and add evidence" }).click();
        await expect(page.getByText("Saved to cases")).toBeVisible();

        await page.goto("/");
        await page.reload();

        const recent = page.getByRole("region", { name: "Recent cases" });
        await expect(recent).toContainText(SCAM_TEXT);
        await expect(recent).toContainText(PHOTO);
        await expect(recent).toContainText(EVIDENCE_SOURCE);

        // Read-only probe of the underlying IndexedDB store that feeds the UI.
        const storedTitles: string[] = await page.evaluate(
            () =>
                new Promise((resolve, reject) => {
                    const request = indexedDB.open("frithward-cases");
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => {
                        const tx = request.result.transaction("cases", "readonly");
                        const all = tx.objectStore("cases").getAll();
                        all.onsuccess = () =>
                            resolve(
                                (all.result as Array<{ title: string }>).map((item) => item.title),
                            );
                        all.onerror = () => reject(all.error);
                    };
                }),
        );
        expect(storedTitles).toEqual(expect.arrayContaining([SCAM_TEXT, PHOTO, EVIDENCE_SOURCE]));

        const recentChecks = await page.evaluate(() =>
            localStorage.getItem("frithward.recent-checks"),
        );
        expect(recentChecks).not.toBeNull();
        expect(recentChecks).toContain(SCAM_TEXT);
    });
}
