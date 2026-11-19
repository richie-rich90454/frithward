import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("./check-boundaries.mjs", import.meta.url));

let passed = 0;

function write(root, path, content) {
    const full = join(root, ...path.split("/"));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
}

function run(root) {
    const result = spawnSync(process.execPath, [checker, root], { encoding: "utf8" });
    return { status: result.status, output: `${result.stdout || ""}${result.stderr || ""}` };
}

function withRoot(name, body) {
    const root = mkdtempSync(join(tmpdir(), "fw-boundary-"));
    try {
        body(root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

function expectViolation(name, setup, needle, minimum = 1) {
    withRoot(name, (root) => {
        setup(root);
        const { status, output } = run(root);
        assert.equal(status, 1, `${name}: expected exit 1, got ${status}\n${output}`);
        assert.ok(output.includes(needle), `${name}: expected "${needle}" in:\n${output}`);
        const count = output.split(needle).length - 1;
        assert.ok(
            count >= minimum,
            `${name}: expected >= ${minimum} "${needle}", got ${count}\n${output}`,
        );
        console.log(`ok - ${name}`);
        passed += 1;
    });
}

function expectClean(name, setup) {
    withRoot(name, (root) => {
        setup(root);
        const { status, output } = run(root);
        assert.equal(status, 0, `${name}: expected exit 0, got ${status}\n${output}`);
        console.log(`ok - ${name}`);
        passed += 1;
    });
}

/** A logic package whose barrel re-exports infrastructure and a view-model type. */
function logicPackage(root) {
    write(
        root,
        "packages/logic-core/package.json",
        JSON.stringify({
            name: "@frithward/logic-core",
            exports: { ".": "./src/index.ts" },
        }),
    );
    write(
        root,
        "packages/logic-core/src/index.ts",
        'export * from "./infrastructure/Adapter.js";\nexport type { ViewModel } from "./presentation/view-models/ViewModel.js";\n',
    );
    write(root, "packages/logic-core/src/infrastructure/Adapter.ts", "export class Adapter {}\n");
    write(
        root,
        "packages/logic-core/src/presentation/view-models/ViewModel.ts",
        "export interface ViewModel { id: string }\n",
    );
}

expectViolation(
    "tsx value import from logic barrel is flagged",
    (root) => {
        logicPackage(root);
        write(
            root,
            "apps/web/src/View.tsx",
            'import { Adapter } from "@frithward/logic-core";\nexport const View = () => null;\n',
        );
    },
    "tsx must not import infrastructure",
);

expectClean("tsx type-only import from logic barrel is allowed", (root) => {
    logicPackage(root);
    write(
        root,
        "apps/web/src/View.tsx",
        'import type { ViewModel } from "@frithward/logic-core";\nexport const View = () => null;\n',
    );
});

expectViolation(
    "tsx under a presentation folder is still classified tsx",
    (root) => {
        logicPackage(root);
        write(
            root,
            "apps/web/src/features/x/presentation/pages/View.tsx",
            'import { Adapter } from "@frithward/logic-core";\nexport const View = () => null;\n',
        );
    },
    "tsx must not import infrastructure",
);

expectViolation(
    "tsx export-from logic barrel is flagged",
    (root) => {
        logicPackage(root);
        write(root, "apps/web/src/View.tsx", 'export { Adapter } from "@frithward/logic-core";\n');
    },
    "tsx must not import infrastructure",
);

expectViolation(
    "domain relative import of infrastructure is flagged",
    (root) => {
        logicPackage(root);
        write(
            root,
            "packages/logic-core/src/domain/Entity.ts",
            'import { Adapter } from "../infrastructure/Adapter.js";\n',
        );
    },
    "domain must not import infrastructure",
);

expectViolation(
    "application import of a tsx file is flagged",
    (root) => {
        write(root, "apps/web/src/View.tsx", "export const View = () => null;\n");
        write(
            root,
            "packages/logic-core/src/application/UseCase.ts",
            'import { View } from "../../../../apps/web/src/View.tsx";\n',
        );
    },
    "application must not import infrastructure/tsx",
);

expectViolation(
    "presentation .ts import of infrastructure is flagged",
    (root) => {
        logicPackage(root);
        write(
            root,
            "packages/logic-core/src/presentation/Controller.ts",
            'import { Adapter } from "../infrastructure/Adapter.js";\n',
        );
    },
    "presentation must not import infrastructure",
);

expectViolation(
    "dynamic import and require of infrastructure are flagged",
    (root) => {
        logicPackage(root);
        write(
            root,
            "packages/logic-core/src/domain/Entity.ts",
            'const a = await import("../infrastructure/Adapter.js");\nconst b = require("../infrastructure/Adapter.js");\n',
        );
    },
    "domain must not import infrastructure",
    2,
);

expectViolation(
    "frontend import of a backend service is flagged",
    (root) => {
        write(root, "services/api/package.json", JSON.stringify({ name: "@frithward/api" }));
        write(root, "apps/web/src/View.tsx", 'import { api } from "@frithward/api";\n');
    },
    "frontend must not import backend service",
);

expectViolation(
    "desktop frontend import of a backend service is flagged",
    (root) => {
        write(root, "services/api/package.json", JSON.stringify({ name: "@frithward/api" }));
        write(root, "apps/desktop/src/View.tsx", 'const api = await import("@frithward/api");\n');
    },
    "frontend must not import backend service",
);

expectClean("clean boundaries pass", (root) => {
    logicPackage(root);
    write(
        root,
        "apps/web/src/View.tsx",
        'import type { ViewModel } from "@frithward/logic-core";\nexport const View = () => null;\n',
    );
    write(root, "packages/logic-core/src/domain/Entity.ts", "export class Entity {}\n");
});

console.log(`\n${passed} boundary checks passed.`);
