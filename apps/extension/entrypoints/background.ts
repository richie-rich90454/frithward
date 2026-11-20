import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { buildCheckUrl } from "../config";

const CHECK_TYPES = ["frithward:check-page", "frithward:check-selection"] as const;
const MENU_ID = "frithward-check-selection";

export default defineBackground(() => {
    try {
        browser.contextMenus.create({
            id: MENU_ID,
            title: "Check with Frithward",
            contexts: ["selection"],
        });
    } catch {
        // Ignore duplicate ids (e.g. service-worker restart or reload).
    }

    browser.contextMenus.onClicked.addListener(async (info) => {
        if (info.menuItemId !== MENU_ID || !info.selectionText) return;
        try {
            await browser.tabs.create({ url: buildCheckUrl(info.selectionText) });
        } catch {
            // The browser may block opening a tab; nothing else to do here.
        }
    });

    browser.runtime.onMessage.addListener(async (message: unknown) => {
        if (typeof message !== "object" || message === null) return undefined;
        const type = (message as { type?: string }).type;
        if (type === undefined || !(CHECK_TYPES as readonly string[]).includes(type)) {
            return undefined;
        }

        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (tabId === undefined) {
            return { type: "frithward:check-page-result", error: "No active tab was found." };
        }
        try {
            const response = (await browser.tabs.sendMessage(tabId, { type })) as unknown;
            if (typeof response !== "object" || response === null) {
                return {
                    type: "frithward:check-page-result",
                    error: "The page did not return a readable response.",
                };
            }
            return response;
        } catch {
            return {
                type: "frithward:check-page-result",
                error: "The page could not be read. It may be a browser-internal page.",
            };
        }
    });
});
