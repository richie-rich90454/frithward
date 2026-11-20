import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = resolve(repoRoot, "apps", "web");
const outDir = resolve(webDir, "dist");

mkdirSync(outDir, { recursive: true });
for (const name of ["vercel.json", "netlify.toml"]) {
    copyFileSync(resolve(webDir, name), resolve(outDir, name));
    console.log(`copied ${name} -> dist/${name}`);
}
