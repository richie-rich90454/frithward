import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// whisper.cpp uses pthreads + SharedArrayBuffer, which browsers expose only in a cross-origin isolated context.
const isolationHeaders = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
};

export default defineConfig({
    plugins: [solid()],
    server: {
        port: 5173,
        headers: isolationHeaders,
    },
    preview: {
        headers: isolationHeaders,
    },
});
