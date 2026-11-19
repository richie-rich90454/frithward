import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WARNING = "C2PA native binary unavailable; signature verification disabled";

function describe(error) {
    return error instanceof Error ? error.message : String(error);
}

function findPackageDir() {
    const fromCore = createRequire(join(ROOT, "packages", "provenance-core", "package.json"));
    try {
        return dirname(fromCore.resolve("@contentauth/c2pa-node/package.json"));
    } catch {
        // pnpm virtual store: fall back to scanning when no symlink is exposed.
        const store = join(ROOT, "node_modules", ".pnpm");
        if (!existsSync(store)) return null;
        const entry = readdirSync(store).find((name) => name.startsWith("@contentauth+c2pa-node@"));
        return entry ? join(store, entry, "node_modules", "@contentauth", "c2pa-node") : null;
    }
}

function main() {
    const dir = findPackageDir();
    if (!dir) {
        console.warn(`${WARNING}: @contentauth/c2pa-node is not installed in this workspace.`);
        return;
    }

    const binary = join(dir, "dist", "index.node");
    if (existsSync(binary)) {
        console.log("C2PA native binary already present; signature verification is enabled.");
        return;
    }

    const postinstall = join(dir, "scripts", "postinstall.cjs");
    if (!existsSync(postinstall)) {
        console.warn(`${WARNING}: package postinstall script is missing.`);
        return;
    }

    // The addon's own postinstall downloads a prebuilt binary or builds Rust; bound it
    // so a stalled download cannot hang pnpm install forever.
    const result = spawnSync(process.execPath, [postinstall], {
        cwd: dir,
        stdio: "inherit",
        timeout: 60_000,
    });

    if (existsSync(binary)) {
        console.log("C2PA native binary provisioned; signature verification is enabled.");
        return;
    }

    const error = result.error ?? new Error(`postinstall exited with code ${result.status}`);
    console.warn(`${WARNING}: ${describe(error)}`);
}

try {
    main();
} catch (error) {
    console.warn(`${WARNING}: ${describe(error)}`);
}
