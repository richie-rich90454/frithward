import { defineConfig } from "wxt";
import solid from "vite-plugin-solid";

export default defineConfig({
    outDir: "dist",
    vite: () => ({
        plugins: [solid()],
    }),
});
