import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const MOUNT = "/frithward";
const webDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "../apps/web");

const MIME: Record<string, string> = {
    ".css": "text/css",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".json": "application/json",
    ".mjs": "text/javascript",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".wasm": "application/wasm",
    ".webmanifest": "application/manifest+json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".xml": "application/xml",
};

let server: Server;
let port: number;
let siteRoot: string;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
    siteRoot = join(tmpdir(), `frithward-subpath-${test.info().project.name}`);
    rmSync(siteRoot, { recursive: true, force: true });
    mkdirSync(siteRoot, { recursive: true });
    const target = join(siteRoot, "frithward");

    // Build the real app for /frithward/ so import.meta.env.BASE_URL and the
    // emitted asset URLs match a genuine sub-path deployment.
    const viteBin = join(webDir, "node_modules", "vite", "bin", "vite.js");
    const build = spawnSync(process.execPath, [viteBin, "build", "--outDir", target], {
        cwd: webDir,
        env: { ...process.env, VITE_BASE: `${MOUNT}/` },
        encoding: "utf8",
        timeout: 300_000,
    });
    if (build.status !== 0) {
        throw new Error(`sub-path build failed\n${build.stdout}\n${build.stderr}`);
    }

    server = createServer((request, response) => {
        const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname);
        if (pathname !== MOUNT && !pathname.startsWith(`${MOUNT}/`)) {
            response.writeHead(404);
            response.end("outside mount");
            return;
        }
        let relative = pathname.slice(MOUNT.length) || "/";
        if (relative === "/") relative = "/index.html";
        let file = join(target, relative);
        if (!file.startsWith(target)) {
            response.writeHead(404);
            response.end("traversal");
            return;
        }
        if (!existsSync(file) || statSync(file).isDirectory()) {
            // SPA rewrite: extension-less deep links serve the app shell.
            if (extname(pathname) === "") file = join(target, "index.html");
            else {
                response.writeHead(404);
                response.end(`asset not found: ${basename(pathname)}`);
                return;
            }
        }
        response.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
        response.end(readFileSync(file));
    });
    port = await new Promise<number>((done) => {
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") throw new Error("no server port");
            done(address.port);
        });
    });
});

test.afterAll(async () => {
    if (server) await new Promise<void>((done) => server.close(() => done()));
    if (siteRoot) rmSync(siteRoot, { recursive: true, force: true });
});

test("deep link on /frithward/ renders with no 404s or page errors", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const failures: string[] = [];
    page.on("response", (response) => {
        if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));

    const origin = `http://127.0.0.1:${port}`;
    await page.goto(`${origin}${MOUNT}/tools/captions`);
    await expect(page.getByRole("heading", { name: "Caption studio" })).toBeVisible({
        timeout: 60_000,
    });

    expect(await page.locator("base").getAttribute("href")).toBe(`${MOUNT}/`);
    expect(await page.evaluate(() => document.baseURI)).toBe(`${origin}${MOUNT}/`);

    // Router navigation must stay inside the sub-path.
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page.locator("h1").first()).toBeVisible();
    expect(page.url().replace(/\/$/, "")).toBe(`${origin}${MOUNT}`);

    expect(failures, failures.join("\n")).toEqual([]);
    await context.close();
});
