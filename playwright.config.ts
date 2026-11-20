import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    // The app ships a 13 MB JS bundle plus ~26 MB WASM assets; too many
    // parallel workers make cold loads (especially WebKit) exceed the timeout.
    workers: 2,
    timeout: 120_000,
    expect: {
        // The 13 MB JS bundle + ~26 MB WASM assets need longer than the 5 s
        // default when several workers load the app at once on a cold cache.
        timeout: 30_000,
    },
    use: {
        baseURL: "http://127.0.0.1:4173",
    },
    webServer: {
        command: "pnpm --filter @frithward/web run preview --host 127.0.0.1 --port 4173",
        port: 4173,
        reuseExistingServer: true,
        timeout: 120_000,
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],
});
