import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
    matches: ["<all_urls>"],
    main() {
        browser.runtime.onMessage.addListener((message: unknown) => {
            if (typeof message !== "object" || message === null) return undefined;
            const type = (message as { type?: string }).type;
            if (type !== "frithward:check-page" && type !== "frithward:check-selection") {
                return undefined;
            }
            const text =
                type === "frithward:check-selection"
                    ? (window.getSelection()?.toString() ?? "")
                    : (document.body?.innerText.slice(0, 20000) ?? "");
            return Promise.resolve({
                type: "frithward:check-page-result",
                url: window.location.href,
                text,
            });
        });
    },
});
