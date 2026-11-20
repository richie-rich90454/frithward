import { defineConfig } from "wxt";
import solid from "vite-plugin-solid";

export default defineConfig({
    outDir: "dist",
    suppressWarnings: { firefoxDataCollection: true },
    manifest: {
        permissions: ["storage", "contextMenus"],
        browser_specific_settings: {
            gecko: {
                id: "frithward@richie-rich90454.github.io",
            },
        },
    },
    vite: () => ({
        plugins: [solid()],
    }),
});
