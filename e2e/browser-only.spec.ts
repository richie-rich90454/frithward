import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

const ROUTES = [
    "/",
    "/tools",
    "/tools/captions",
    "/tools/documents",
    "/tools/diagrams",
    "/tools/charts",
    "/tools/runtime",
    "/tools/models",
    "/check",
    "/protect",
    "/verify",
    "/respond",
    "/learn",
    "/community",
] as const;

function trackBackendCalls(page: Page): string[] {
    const calls: string[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/api/")) calls.push(request.url());
    });
    return calls;
}

function trackPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    return errors;
}

function isBrowserUrl(url: string): boolean {
    return url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("about:");
}

for (const route of ROUTES) {
    test(`A: ${route} renders with no page errors and no /api/ calls`, async ({ page }) => {
        const apiCalls = trackBackendCalls(page);
        const errors = trackPageErrors(page);

        await page.goto(route);
        await expect(page.locator("h1").first()).toBeVisible();

        expect(apiCalls).toEqual([]);
        expect(errors).toEqual([]);
    });
}

test("B: caption project persists in localStorage across a reload with no backend", async ({
    page,
}) => {
    const apiCalls = trackBackendCalls(page);
    await page.goto("/tools/captions");
    await expect(page.getByRole("heading", { name: "Caption studio" })).toBeVisible();

    // The studio has no add-segment control: segments come from a user-supplied
    // Whisper model, so seed the exact record LocalStorageCaptionRepository.save writes.
    const key = "frithward.caption.caption-studio";
    const record = {
        id: "caption-studio",
        title: "Untitled captions",
        language: "en",
        segments: [
            { id: "s1", startMs: 0, endMs: 1500, text: "Browser-only caption", speakerId: null },
        ],
    };
    await page.evaluate(
        ([storageKey, value]) => localStorage.setItem(storageKey, value),
        [key, JSON.stringify(record)],
    );

    await page.reload();
    await expect(page.getByRole("heading", { name: "Caption studio" })).toBeVisible();
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
        JSON.stringify(record),
    );
    expect(apiCalls).toEqual([]);
});

test("C: core routes render with all cross-origin requests blocked", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await page.route("**/*", async (route) => {
        const url = route.request().url();
        if (isBrowserUrl(url)) return route.continue();
        if (new URL(url).origin !== BASE_URL) return route.abort();
        return route.continue();
    });

    for (const route of ["/", "/check", "/tools/captions", "/tools/charts", "/tools/diagrams"]) {
        await page.goto(route);
        await expect(page.locator("h1").first()).toBeVisible();
    }
    await context.close();
});

test("D: loading the app makes no requests to external hosts", async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? BASE_URL).origin;
    const external: string[] = [];
    page.on("request", (request) => {
        const url = request.url();
        if (isBrowserUrl(url)) return;
        if (new URL(url).origin !== origin) external.push(url);
    });

    for (const route of ["/", "/tools/documents", "/tools/runtime", "/tools/models"]) {
        await page.goto(route);
        await expect(page.locator("h1").first()).toBeVisible();
    }
    expect(external).toEqual([]);
});
