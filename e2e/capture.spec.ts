import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const tone = fileURLToPath(new URL("./fixtures/tone.wav", import.meta.url));
const photo = fileURLToPath(new URL("./fixtures/photo-with-exif.jpg", import.meta.url));

async function stubGetUserMedia(context: BrowserContext, granted: boolean): Promise<void> {
    await context.addInitScript((allow) => {
        const mediaDevices = navigator.mediaDevices;
        const fake = async () => {
            if (!allow) throw new DOMException("denied by test stub", "NotAllowedError");
            // No hardware is involved: the capture inputs are file inputs, so a
            // MediaStream-shaped value is enough for the stubbed permission path.
            return { getTracks: () => [], getAudioTracks: () => [] };
        };
        if (mediaDevices) {
            Object.defineProperty(mediaDevices, "getUserMedia", {
                configurable: true,
                value: fake,
            });
        } else {
            Object.defineProperty(navigator, "mediaDevices", {
                configurable: true,
                value: { getUserMedia: fake },
            });
        }
    }, granted);
}

function trackErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    return errors;
}

for (const permission of ["granted", "denied"] as const) {
    test(`mobile capture inputs are real and reachable (getUserMedia ${permission})`, async ({
        browser,
    }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 },
            baseURL: "http://127.0.0.1:4173",
        });
        await stubGetUserMedia(context, permission === "granted");
        const page = await context.newPage();
        const errors = trackErrors(page);

        await page.goto("/tools/captions");
        const recordAudio = page.getByLabel("Record audio");
        await expect(recordAudio).toBeVisible();
        await expect(recordAudio).toBeEnabled();
        expect(await recordAudio.getAttribute("capture"), "captions capture hint").toBe(
            "microphone",
        );
        const audioChooser = page.waitForEvent("filechooser");
        await recordAudio.click();
        await (
            await audioChooser
        ).setFiles({
            name: "tone.wav",
            mimeType: "audio/wav",
            buffer: readFileSync(tone),
        });
        await expect(page.getByRole("button", { name: "Generate captions" })).toBeEnabled();

        await page.goto("/protect");
        const takePhoto = page.getByLabel("Take photo");
        await expect(takePhoto).toBeVisible();
        await expect(takePhoto).toBeEnabled();
        expect(await takePhoto.getAttribute("capture"), "protect capture hint").toBe("environment");
        const photoChooser = page.waitForEvent("filechooser");
        await takePhoto.click();
        await (
            await photoChooser
        ).setFiles({
            name: "photo-with-exif.jpg",
            mimeType: "image/jpeg",
            buffer: readFileSync(photo),
        });
        await expect(page.getByText("Selected: photo-with-exif.jpg")).toBeVisible();

        // The stub only covers getUserMedia; no real microphone capture is claimed.
        expect(
            await page.evaluate(async () => {
                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                    return "granted";
                } catch {
                    return "denied";
                }
            }),
        ).toBe(permission);

        expect(errors, errors.join("\n")).toEqual([]);
        await context.close();
    });
}
