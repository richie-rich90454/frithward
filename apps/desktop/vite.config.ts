import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const designSystem = fileURLToPath(new URL("../../packages/design-system", import.meta.url));
const captionsCss = fileURLToPath(
    new URL("../web/src/features/captions/presentation/captions.css", import.meta.url),
);

export default defineConfig({
    plugins: [solid()],
    resolve: {
        alias: {
            "@frithward/design-system": designSystem,
            // shortcut: web's CaptionStudioView imports ./captions.css from pages/, but the file lives one level up; drop this when web fixes it.
            "./captions.css": captionsCss,
        },
    },
});
