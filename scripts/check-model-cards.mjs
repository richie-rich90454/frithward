#!/usr/bin/env node
// Enforces that every model id in models/manifest.json has a card with all
// required fields. Run directly in CI: node scripts/check-model-cards.mjs
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MODELS_DIR = join(ROOT, "models");
const MANIFEST = join(MODELS_DIR, "manifest.json");

// The 13 fields every model card must document. Aliases keep the check robust
// to heading vs. bold-label vs. "Field: value" styles without weakening it.
const REQUIRED_FIELDS = [
    { label: "Model id", aliases: ["model id", "model name", "model identifier", "id"] },
    { label: "Stage", aliases: ["stage", "release stage", "status"] },
    { label: "Intended use", aliases: ["intended use", "intended uses", "use case"] },
    { label: "Prohibited use", aliases: ["prohibited use", "prohibited uses", "out of scope"] },
    { label: "Architecture", aliases: ["architecture", "model architecture"] },
    { label: "Training data", aliases: ["training data", "training dataset", "training set"] },
    {
        label: "Dataset licenses",
        aliases: ["dataset licenses", "dataset licence", "dataset license", "dataset licences"],
    },
    {
        label: "Evaluation results",
        aliases: ["evaluation results", "evaluation", "benchmark results", "benchmarks"],
    },
    { label: "Known biases", aliases: ["known biases", "known bias", "bias"] },
    {
        label: "Hardware requirements",
        aliases: ["hardware requirements", "hardware", "compute requirements"],
    },
    { label: "License", aliases: ["license", "licence", "model license", "model licence"] },
    { label: "Limitations", aliases: ["limitations", "known limitations"] },
    { label: "Version history", aliases: ["version history", "versions", "changelog"] },
];

function fail(message) {
    console.error(`check-model-cards: ${message}`);
    process.exit(1);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasField(text, aliases) {
    return aliases.some((alias) => {
        const escaped = escapeRegExp(alias);
        // Markdown heading: "## Intended use"
        const heading = new RegExp(`^[ \\t]{0,3}#{1,6}[ \\t]+${escaped}[ \\t]*:?[ \\t]*$`, "im");
        // Bold or plain label followed by a colon: "**Intended use:**" / "Intended use:"
        const labelled = new RegExp(
            `(?:^|\\*\\*)[ \\t]*(?<![\\w-])${escaped}[ \\t]*(?:\\*\\*)?[ \\t]*:`,
            "im",
        );
        return heading.test(text) || labelled.test(text);
    });
}

function readModelIds(raw) {
    const data = JSON.parse(raw);
    const candidates = Array.isArray(data) ? data : (data.models ?? data.entries ?? []);
    if (!Array.isArray(candidates)) {
        fail("manifest.json must be an array of models or an object with a 'models' array.");
    }
    const ids = candidates
        .map((entry) => (typeof entry === "string" ? entry : (entry?.id ?? entry?.modelId)))
        .filter((id) => typeof id === "string" && id.trim().length > 0);
    if (ids.length === 0) {
        fail("manifest.json contains no model ids to check.");
    }
    return [...new Set(ids)];
}

if (!existsSync(MODELS_DIR) || !existsSync(MANIFEST)) {
    fail(
        "models/ or models/manifest.json is missing. The model-card agent must land the " +
            "manifest and cards before this check can pass; nothing is fabricated here.",
    );
}

let ids;
try {
    ids = readModelIds(readFileSync(MANIFEST, "utf8"));
} catch (error) {
    fail(`could not parse models/manifest.json: ${error.message}`);
}

const problems = [];
for (const id of ids) {
    const cardPath = join(MODELS_DIR, id, "model-card.md");
    if (!existsSync(cardPath)) {
        problems.push(`- ${id}: missing models/${id}/model-card.md`);
        continue;
    }
    const text = readFileSync(cardPath, "utf8");
    const missing = REQUIRED_FIELDS.filter((field) => !hasField(text, field.aliases)).map(
        (field) => field.label,
    );
    if (missing.length > 0) {
        problems.push(`- ${id}: missing fields: ${missing.join(", ")}`);
    }
}

if (problems.length > 0) {
    fail(`${problems.length} model card problem(s):\n${problems.join("\n")}`);
}

console.log(
    `check-model-cards: ${ids.length} model(s) OK (${REQUIRED_FIELDS.length} fields each).`,
);
