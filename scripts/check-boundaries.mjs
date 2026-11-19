import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Enforces the architectural boundaries described in CONTRIBUTING.md at the module
 * boundary. Run from the repo root, or pass a root directory as argv[2] for tests.
 *
 * Every path is normalised to forward slashes before matching so the rules behave
 * identically on Windows and POSIX. `.tsx` is classified before `presentation`, so a
 * component living under a presentation folder is still subject to the TSX rules.
 */

const ROOT = resolve(process.argv[2] ?? process.cwd()).replaceAll("\\", "/");
const SCAN_DIRS = ["apps", "packages", "services", "tools"];
const violations = [];
let scanned = 0;

const toSlash = (p) => String(p).replaceAll("\\", "/");
const fromSlash = (p) => String(p).replaceAll("/", "\\");
const abs = (...parts) => toSlash(resolve(parts.map(toSlash).join("/")));
const relDir = (p) => toSlash(dirname(toSlash(p)));

function relative(file) {
    return toSlash(file).slice(ROOT.length + 1);
}

// Layer markers are anchored on `/src/<layer>/` so app-local folders such as
// features/captions/infrastructure are not confused with package infrastructure.
const LAYER_MARKERS = [
    ["domain", "/src/domain/"],
    ["application", "/src/application/"],
    ["ports", "/src/ports/"],
    ["infrastructure", "/src/infrastructure/"],
    ["presentation", "/src/presentation/"],
];

function layersInPath(path) {
    const value = toSlash(path);
    const result = new Set();
    if (/\.tsx$/i.test(value)) result.add("tsx");
    for (const [name, marker] of LAYER_MARKERS) {
        if (value.includes(marker)) result.add(name);
    }
    return result;
}

function layerOf(file) {
    if (/\.tsx$/i.test(file)) return "tsx";
    for (const [name, marker] of LAYER_MARKERS) {
        if (file.includes(marker)) return name;
    }
    return "other";
}

/** Returns every module reference in a source file, with line numbers. */
function parseImports(source) {
    const found = [];
    const add = (specifier, isTypeOnly, index) => {
        found.push({ specifier, isTypeOnly, line: source.slice(0, index).split("\n").length });
    };

    // `import ... from`, `import type ... from`, `export ... from`, `export * from`.
    // `[^;]*?` lets the bindings span multiple lines without crossing a statement.
    const fromRegex = /\b(import|export)\b([^;]*?)\bfrom\s*["']([^"']+)["']/g;
    let match;
    while ((match = fromRegex.exec(source)) !== null) {
        add(match[3], /^\s*type\b/.test(match[2]), match.index);
    }

    // Side-effect imports: import "./styles.css".
    const bareRegex = /\bimport\s*["']([^"']+)["']/g;
    while ((match = bareRegex.exec(source)) !== null) add(match[1], false, match.index);

    // Dynamic import("...") and require("...").
    const dynamicRegex = /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((match = dynamicRegex.exec(source)) !== null) add(match[1], false, match.index);

    return found;
}

const packageJsonCache = new Map();

function readPackageJson(path) {
    if (packageJsonCache.has(path)) return packageJsonCache.get(path);
    let value = null;
    if (existsSync(fromSlash(path))) {
        try {
            value = JSON.parse(readFileSync(fromSlash(path), "utf8"));
        } catch {
            value = null;
        }
    }
    packageJsonCache.set(path, value);
    return value;
}

/** Resolve `@frithward/<pkg>[/subpath]` to its source entry via package.json exports. */
function resolveWorkspaceBarrel(specifier) {
    const segments = specifier.split("/");
    const name = segments[1];
    if (!name) return null;
    const subpath = segments.slice(2).join("/");
    const candidates = [
        `${ROOT}/node_modules/@frithward/${name}/package.json`,
        `${ROOT}/packages/${name}/package.json`,
    ];
    for (const packageJson of candidates) {
        const manifest = readPackageJson(packageJson);
        if (!manifest?.exports) continue;
        const exports = manifest.exports;
        let target;
        if (typeof exports === "string") {
            target = exports;
        } else if (subpath) {
            target = exports[`./${subpath}`];
        } else {
            target = exports["."];
        }
        if (target && typeof target === "object") target = target.default ?? target.import;
        if (typeof target === "string") return abs(relDir(packageJson), target);
    }
    return null;
}

/** Collect the layers a barrel exposes through its re-exports, with a cycle guard. */
function barrelLayers(barrel, seen = new Set()) {
    const result = layersInPath(barrel);
    if (seen.has(barrel)) return result;
    seen.add(barrel);
    let source;
    try {
        source = readFileSync(fromSlash(barrel), "utf8");
    } catch {
        return result;
    }
    for (const ref of parseImports(source)) {
        if (ref.specifier.startsWith(".")) {
            for (const layer of layersInPath(abs(relDir(barrel), ref.specifier))) result.add(layer);
        } else if (ref.specifier.startsWith("@frithward/")) {
            const nested = resolveWorkspaceBarrel(ref.specifier);
            const layers = nested ? barrelLayers(nested, seen) : layersInPath(ref.specifier);
            for (const layer of layers) result.add(layer);
        }
    }
    return result;
}

function targetOf(file, specifier, expandBarrel) {
    if (specifier.startsWith(".")) {
        const resolved = abs(relDir(file), specifier);
        return { layers: layersInPath(resolved), resolved };
    }
    // Only TSX imports need barrel expansion. Presentation controllers and package
    // tests import logic barrels by design, so expanding them for other layers would
    // flag established composition code.
    if (expandBarrel && specifier.startsWith("@frithward/")) {
        const barrel = resolveWorkspaceBarrel(specifier);
        if (barrel) return { layers: barrelLayers(barrel), resolved: barrel };
    }
    return { layers: layersInPath(specifier), resolved: specifier };
}

const servicePackages = new Set();
if (existsSync(`${ROOT}/services`)) {
    for (const entry of readdirSync(`${ROOT}/services`, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const manifest = readPackageJson(`${ROOT}/services/${entry.name}/package.json`);
        if (typeof manifest?.name === "string") servicePackages.add(manifest.name);
    }
}

function isFrontend(file) {
    return file.startsWith(`${ROOT}/apps/web/`) || file.startsWith(`${ROOT}/apps/desktop/`);
}

function targetsBackend(specifier, resolved) {
    return (
        servicePackages.has(specifier) ||
        /(^|\/)services\//.test(toSlash(specifier)) ||
        /(^|\/)services\//.test(toSlash(resolved))
    );
}

function checkFile(file) {
    scanned += 1;
    const layer = layerOf(file);
    const source = readFileSync(fromSlash(file), "utf8");
    for (const ref of parseImports(source)) {
        const target = targetOf(file, ref.specifier, layer === "tsx");
        const at = `${relative(file)}:${ref.line}`;

        if (isFrontend(file) && targetsBackend(ref.specifier, target.resolved)) {
            violations.push(`${at}: frontend must not import backend service ${ref.specifier}`);
            continue;
        }

        if (layer === "domain") {
            if (target.layers.has("infrastructure") || target.layers.has("presentation") || target.layers.has("tsx")) {
                violations.push(`${at}: domain must not import infrastructure/presentation/tsx ${ref.specifier}`);
            }
        } else if (layer === "application") {
            if (target.layers.has("infrastructure") || target.layers.has("tsx")) {
                violations.push(`${at}: application must not import infrastructure/tsx ${ref.specifier}`);
            }
        } else if (layer === "presentation") {
            if (target.layers.has("infrastructure")) {
                violations.push(`${at}: presentation must not import infrastructure ${ref.specifier}`);
            }
        } else if (layer === "tsx") {
            // Type-only imports are erased at runtime, so they cannot place logic in the
            // render tree. TSX views legitimately import view-model types (e.g.
            // CaptionStudioViewModel) from logic barrels via `import type`; flagging those
            // would be a false positive. Skip type-only imports and flag every runtime
            // import of a logic layer, including through barrels that re-export it.
            if (ref.isTypeOnly) continue;
            const forbidden = ["domain", "application", "ports", "infrastructure"].find((name) =>
                target.layers.has(name),
            );
            if (forbidden) {
                violations.push(`${at}: tsx must not import ${forbidden} at runtime ${ref.specifier}`);
            }
        }
    }
}

function walk(dir) {
    if (!existsSync(fromSlash(dir))) return;
    for (const entry of readdirSync(fromSlash(dir))) {
        if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
        const full = `${dir}/${entry}`;
        if (statSync(fromSlash(full)).isDirectory()) {
            walk(full);
        } else if (/\.tsx?$/i.test(entry) && !/\.d\.ts$/i.test(entry)) {
            checkFile(full);
        }
    }
}

for (const dir of SCAN_DIRS) walk(`${ROOT}/${dir}`);

if (violations.length > 0) {
    console.error([...new Set(violations)].join("\n"));
    process.exit(1);
}
console.log(`Module boundaries OK. Scanned ${scanned} files.`);
