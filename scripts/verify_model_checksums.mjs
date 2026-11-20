import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Verifies locally present model artifacts against models/manifest.json.
 * Never downloads anything: entries without a local file are skipped with a
 * clear message. A checksum mismatch sets a non-zero exit code.
 */
const ROOT = resolve(import.meta.dirname, "..");
const manifestPath = process.argv[2] ?? resolve(ROOT, "models", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entries = Array.isArray(manifest) ? manifest : manifest.models;

if (!Array.isArray(entries)) {
    console.error(`Manifest has no model entries: ${manifestPath}`);
    process.exitCode = 1;
} else {
    for (const entry of entries) {
        const relative = String(entry.localPathHint ?? "").replaceAll("\\", "/");
        const localPath = resolve(ROOT, relative);
        if (!relative || !existsSync(localPath) || !statSync(localPath).isFile()) {
            console.log(`SKIP ${entry.id}: no local file at ${relative || "(no path hint)"}`);
            continue;
        }
        if (!entry.sha256) {
            console.log(`SKIP ${entry.id}: no pinned sha256 in manifest (${relative})`);
            continue;
        }

        const hash = createHash("sha256");
        for await (const chunk of createReadStream(localPath)) {
            hash.update(chunk);
        }
        const actual = hash.digest("hex").toLowerCase();
        const expected = String(entry.sha256).toLowerCase();
        if (actual !== expected) {
            console.error(`FAIL ${entry.id}: sha256 mismatch for ${relative}`);
            console.error(`  expected ${expected}`);
            console.error(`  actual   ${actual}`);
            process.exitCode = 1;
        } else {
            console.log(`OK ${entry.id}: ${relative}`);
        }
    }
}
