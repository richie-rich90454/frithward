import { readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";

// whisper.cpp uses pthreads + SharedArrayBuffer, which browsers expose only in a cross-origin isolated context.
// COEP stays `require-corp` (not `credentialless`): every runtime asset is same-origin, so the stricter
// policy blocks nothing and has wider browser support. These headers cover dev/preview only — a static
// host must send them too; see the shipped public/_headers, vercel.json and netlify.toml.
const isolationHeaders = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
};

function listOutputFiles(dir: string, prefix: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = `${prefix}/${entry.name}`;
        if (entry.isDirectory()) {
            files.push(...listOutputFiles(resolve(dir, entry.name), rel));
        } else if (entry.isFile()) {
            files.push(rel);
        }
    }
    return files;
}

// Emits the list of built files so the service worker can precache them without hardcoding hashed names.
function precacheManifest(): Plugin {
    let outDir = "";
    return {
        name: "frithward-precache-manifest",
        apply: "build",
        configResolved(config) {
            outDir = resolve(config.root, config.build.outDir);
        },
        closeBundle() {
            const files = listOutputFiles(outDir, "")
                .filter((file) => file !== "/sw.js" && file !== "/precache-manifest.json")
                .sort();
            writeFileSync(
                resolve(outDir, "precache-manifest.json"),
                `${JSON.stringify(files, null, 2)}\n`,
            );
        },
    };
}

export default defineConfig({
    plugins: [solid(), precacheManifest()],
    server: {
        port: 5173,
        headers: isolationHeaders,
    },
    preview: {
        headers: isolationHeaders,
    },
});
