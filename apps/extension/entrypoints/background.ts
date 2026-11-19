import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

export default defineBackground(() => {
    browser.runtime.onMessage.addListener(async (message: unknown) => {
        if (typeof message !== "object" || message === null) return undefined;
        if ((message as { type?: string }).type !== "frithward:check-page") return undefined;

        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (tabId === undefined) {
            return { type: "frithward:check-page-result", error: "No active tab was found." };
        }
        try {
            const response = (await browser.tabs.sendMessage(tabId, {
                type: "frithward:check-page",
            })) as unknown;
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
