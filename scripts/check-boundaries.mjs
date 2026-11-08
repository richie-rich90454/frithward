import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const violations = [];

function walk(dir) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
            walk(full);
        } else if (/\.tsx?$/.test(entry)) {
            checkFile(full);
        }
    }
}

function layerOf(file) {
    const rel = file.replace(ROOT + join(""), "").replaceAll("\\", "/");
    if (rel.includes("/src/domain/")) return "domain";
    if (rel.includes("/src/application/")) return "application";
    if (rel.includes("/src/ports/")) return "ports";
    if (rel.includes("/src/infrastructure/")) return "infrastructure";
    if (rel.includes("/src/presentation/")) return "presentation";
    if (rel.endsWith(".tsx")) return "tsx";
    return "other";
}

function importsOf(source) {
    const pattern = /import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?["']([^"']+)["']/g;
    const found = [];
    let match;
    while ((match = pattern.exec(source)) !== null) found.push(match[1]);
    return found;
}

function checkFile(file) {
    const source = readFileSync(file, "utf8");
    const layer = layerOf(file);
    for (const specifier of importsOf(source)) {
        const target = normalize(file, specifier);
        if (!target) continue;
        if (layer === "domain" && /infrastructure|presentation|\.tsx$/.test(target)) {
            violations.push(`${rel(file)}: domain imports forbidden ${specifier}`);
        }
        if (layer === "application" && /infrastructure|\.tsx$/.test(target)) {
            violations.push(`${rel(file)}: application imports forbidden ${specifier}`);
        }
        if (layer === "presentation" && /infrastructure/.test(target)) {
            violations.push(`${rel(file)}: presentation imports forbidden ${specifier}`);
        }
        if (layer === "tsx" && /(domain|application|ports|infrastructure)\//.test(target)) {
            violations.push(`${rel(file)}: tsx must not import logic layer ${specifier}`);
        }
        if (layer === "other" && target.includes("services/api") && file.includes("apps/web")) {
            violations.push(`${rel(file)}: frontend must not import backend ${specifier}`);
        }
    }
    if (layer === "tsx" && /(\balert\s*\(|\bconsole\.log\s*\()/.test(source)) {
        violations.push(`${rel(file)}: tsx contains side effects`);
    }
}

function normalize(file, specifier) {
    if (specifier.startsWith(".")) return join(dirname(file), specifier);
    const root = join(ROOT, specifier);
    if (existsSync(root)) return root;
    return specifier;
}

function dirname(file) {
    return file.slice(0, file.lastIndexOf(join("")));
}

function rel(file) {
    return file.replace(ROOT + join(""), "");
}

walk(ROOT);
if (violations.length > 0) {
    console.error(violations.join("\n"));
    process.exit(1);
}
console.log("Module boundaries OK.");
