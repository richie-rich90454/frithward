import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    timeout: 60000,
    expect: {
        // The 13 MB JS bundle + ~26 MB WASM assets need longer than the 5 s
        // default when several workers load the app at once on a cold cache.
        timeout: 15000,
    },
    use: {
        baseURL: "http://127.0.0.1:4173",
    },
    webServer: {
        command: "pnpm --filter @frithward/web run preview --host 127.0.0.1 --port 4173",
        port: 4173,
        reuseExistingServer: true,
        timeout: 120000,
    },
});
