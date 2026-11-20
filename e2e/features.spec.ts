import { expect, test } from "@playwright/test";
import { stat } from "node:fs/promises";

test.describe("real browser feature behaviour", () => {
    test.describe.configure({ timeout: 120_000 });

    test.describe("document workshop exports", () => {
        test.beforeEach(async ({ page }) => {
            await page.goto("/tools/documents");
            await expect(page.getByRole("heading", { name: "Document workshop" })).toBeVisible({
                timeout: 60_000,
            });
            await page.getByLabel("Title", { exact: true }).fill("Frithward export proof");
            await page
                .getByLabel(/Sections/)
                .fill("## Overview\nThis body section proves the export path actually runs.");
            await page.getByLabel(/Spreadsheet rows/).fill("Name,Value\nAlpha,1\nBeta,2");
            await page.getByLabel(/Slides/).fill("# Slide one\n- A real bullet");
        });

        const cases = [
            { button: "Export DOCX", filename: "document.docx" },
            { button: "Export PDF", filename: "document.pdf" },
            { button: "Export XLSX", filename: "document.xlsx" },
            { button: "Export PPTX", filename: "document.pptx" },
            { button: "Export bundle (ZIP)", filename: "document-bundle.zip" },
        ] as const;

        for (const { button, filename } of cases) {
            test(`${button} downloads a non-empty ${filename}`, async ({ page }) => {
                const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
                await page.getByRole("button", { name: button }).click();
                const download = await downloadPromise;

                expect(download.suggestedFilename()).toBe(filename);
                const path = await download.path();
                expect(path, `${button} produced no download file`).not.toBeNull();
                const info = await stat(path!);
                expect(info.size, `${button} downloaded an empty file`).toBeGreaterThan(0);
                await expect(page.getByRole("alert")).toHaveCount(0);
            });
        }
    });

    test("diagrams render a real Mermaid SVG", async ({ page }) => {
        await page.goto("/tools/diagrams");
        await page.getByLabel("Mermaid source").fill("graph TD\n  A --> B");
        await page.getByRole("button", { name: "Render", exact: true }).click();

        const rendered = page.getByAltText("Rendered diagram");
        await expect(rendered).toBeVisible({ timeout: 30_000 });
        const src = await rendered.getAttribute("src");
        expect(src, "rendered diagram has no data URL").toMatch(/^data:image\/svg\+xml/);
        const svg = decodeURIComponent(src!.slice(src!.indexOf(",") + 1));
        expect(svg).toContain("<svg");
        expect(svg.length).toBeGreaterThan(50);
        await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("charts render a non-zero ECharts canvas from pasted rows", async ({ page }) => {
        await page.goto("/tools/charts");
        await page.getByLabel(/Data \(one/).fill("A,1\nB,2");
        await page.getByLabel("X axis label").fill("Letter");
        await page.getByLabel("Y axis label").fill("Count");
        await page.getByRole("button", { name: "Render chart" }).click();

        const canvas = page.locator("canvas");
        await expect(canvas.first()).toBeVisible({ timeout: 30_000 });
        const box = await canvas.first().boundingBox();
        expect(box, "chart canvas has no box").not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
        await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("runtime reports factual WebGPU status", async ({ page }) => {
        await page.goto("/tools/runtime");
        await page.getByRole("button", { name: "Detect GPU" }).click();

        const status = page.getByText(/Adapter:|WebGPU is unavailable\./);
        await expect(status).toBeVisible({ timeout: 30_000 });
        await expect(
            page.getByText(/compute shader ran successfully|No compute pass was confirmed/),
        ).toBeVisible();
        // The UI must never fabricate availability: either a named adapter or an explicit reason.
        const text = await status.innerText();
        expect(text.length).toBeGreaterThan(0);
    });

    test("scam check flags a credential request and offers guided steps", async ({ page }) => {
        await page.goto("/check");
        await page.getByLabel("Message text").fill("send your password urgently");
        await page.getByRole("button", { name: "Check message" }).click();

        await expect(page.getByText("Credential request", { exact: true })).toBeVisible();

        await page.getByLabel("Simplified mode (one step at a time)").check();
        await expect(page.getByText(/Step\s+1\s*\/\s*\d+/)).toBeVisible();
        await page.getByRole("button", { name: "Next step" }).click();
        await expect(page.getByText(/Step\s+2\s*\/\s*\d+/)).toBeVisible();
    });

    test("captions show an honest empty state (no user-supplied model)", async ({ page }) => {
        await page.goto("/tools/captions");
        await expect(page.getByRole("heading", { name: "Caption studio" })).toBeVisible();
        await expect(page.getByText(/Status:\s*idle/)).toBeVisible();
        await expect(
            page.getByText(/Local generation needs a Whisper WASM runtime supplied by you/),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: "Generate captions" })).toBeDisabled();

        const addSegment = page.getByRole("button", { name: /add (a )?segment/i });
        const exportControl = page.getByRole("button", { name: /export/i });
        if (await addSegment.count()) {
            await addSegment.first().click();
            await expect(page.locator("ul li button").first()).toBeVisible();
        } else {
            await expect(page.locator("ul li button")).toHaveCount(0);
        }
        if (await exportControl.count()) {
            await exportControl.first().click();
            await expect(page.getByRole("alert").or(page.getByText(/no segments/i))).toBeVisible();
        } else {
            await expect(exportControl).toHaveCount(0);
        }
    });

    test("quiz accepts an answer and shows feedback", async ({ page }) => {
        await page.goto("/learn");
        await expect(page.getByRole("heading", { name: "Knowledge check" })).toBeVisible();

        await page
            .getByRole("button", {
                name: "Try to find the earliest post and check an independent source",
            })
            .click();
        await expect(page.getByRole("status").filter({ hasText: "Correct." })).toBeVisible();

        await page.getByRole("button", { name: "Next question" }).click();
        await expect(
            page.getByText(
                "A message says your account will close in ten minutes unless you pay through a link. What does that pressure most likely signal?",
            ),
        ).toBeVisible();
        await page
            .getByRole("button", { name: "An attempt to stop you from checking the claim" })
            .click();
        await expect(page.getByRole("status").filter({ hasText: "Correct." })).toBeVisible();
    });

    test("Arabic switches direction and translates the nav, then back", async ({ page }) => {
        await page.goto("/");
        const switcher = page.locator("select.language-switcher");
        await switcher.selectOption("ar");

        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
        await expect(page.getByRole("link", { name: "الرئيسية" })).toBeVisible();
        await expect(page.getByRole("link", { name: "أدوات المطور" })).toBeVisible();

        await switcher.selectOption("en");
        await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
        await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    });
});

test("document workshop OCR recognizes a supplied image", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/tools/documents");
    await expect(page.getByRole("heading", { name: "Document workshop" })).toBeVisible({
        timeout: 60_000,
    });

    const base64 = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 700;
        canvas.height = 200;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#000000";
        context.font = "bold 80px sans-serif";
        context.fillText("HELLO 12345", 20, 130);
        return canvas.toDataURL("image/png").split(",")[1]!;
    });

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
        name: "ocr-sample.png",
        mimeType: "image/png",
        buffer: Buffer.from(base64, "base64"),
    });

    await expect(page.getByText(/OCR complete/)).toBeVisible({ timeout: 240_000 });
    const sections = await page.getByLabel(/Sections/).inputValue();
    expect(sections).toContain("## OCR text");
    expect(sections.replace("## OCR text", "").trim().length).toBeGreaterThan(0);
});
