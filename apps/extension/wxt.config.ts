import { defineConfig } from "wxt";
import solid from "vite-plugin-solid";

export default defineConfig({
    outDir: "dist",
    manifest: {
        permissions: ["storage", "contextMenus"],
    },
    vite: () => ({
        plugins: [solid()],
    }),
});
