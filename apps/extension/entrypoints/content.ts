import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
    matches: ["<all_urls>"],
    main() {
        browser.runtime.onMessage.addListener((message: unknown) => {
            if (typeof message !== "object" || message === null) return undefined;
            if ((message as { type?: string }).type !== "frithward:check-page") return undefined;
            return Promise.resolve({
                type: "frithward:check-page-result",
                url: window.location.href,
                text: document.body?.innerText.slice(0, 20000) ?? "",
            });
        });
    },
});
