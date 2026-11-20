import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const designSystem = fileURLToPath(new URL("../../packages/design-system", import.meta.url));

export default defineConfig({
    plugins: [solid()],
    resolve: {
        alias: { "@frithward/design-system": designSystem },
    },
});
