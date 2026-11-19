# Third-party licenses

This is a best-effort inventory of **direct** dependencies declared in the repository's `package.json` files. It is not a legal determination and not authoritative: the generated SPDX SBOM (`frithward.spdx.json`, produced by Syft in the `security` CI job) is the artifact to check before a release. Entries marked "verify with syft" are uncertain and must be confirmed. Transitive dependencies are intentionally not listed here.

The project's own source is Apache-2.0 (see [LICENSE](LICENSE)). Model weights and datasets keep their original licenses and are tracked in their model cards and [DATASET_POLICY.md](DATASET_POLICY.md).

## Internal workspace packages

All `@frithward/*` packages are first-party and Apache-2.0: `@frithward/contracts`, `@frithward/design-system`, `@frithward/inference`, `@frithward/media-analysis`, `@frithward/media-core`, `@frithward/media-metadata`, `@frithward/model-manager`, `@frithward/model-registry`, `@frithward/privacy-core`, `@frithward/provenance-core`, `@frithward/runtime`, `@frithward/security-core`.

## External dependencies

| Package | Declared license | Verification |
| --- | --- | --- |
| @aws-sdk/client-s3 | Apache-2.0 | verify with syft |
| @contentauth/c2pa-node | Apache-2.0 | verify with syft |
| @ffmpeg/ffmpeg | MIT (wrapper); bundled FFmpeg build may be LGPL/GPL | verify with syft — check the FFmpeg build license |
| @fontsource/noto-sans | OFL-1.1 | verify with syft |
| @hono/node-server | MIT | verify with syft |
| @hono/zod-openapi | MIT | verify with syft |
| @huggingface/transformers | Apache-2.0 | verify with syft |
| @kobalte/core | MIT | verify with syft |
| @mediapipe/tasks-vision | Apache-2.0 | verify with syft |
| @mlc-ai/web-llm | Apache-2.0 | verify with syft |
| @opentelemetry/api | Apache-2.0 | verify with syft |
| @opentelemetry/auto-instrumentations-node | Apache-2.0 | verify with syft |
| @opentelemetry/exporter-trace-otlp-http | Apache-2.0 | verify with syft |
| @opentelemetry/sdk-node | Apache-2.0 | verify with syft |
| @playwright/test | Apache-2.0 | verify with syft |
| @solid-primitives/i18n | MIT | verify with syft |
| @solidjs/router | MIT | verify with syft |
| @solidjs/testing-library | MIT | verify with syft |
| @tanstack/solid-query | MIT | verify with syft |
| @testing-library/dom | MIT | verify with syft |
| @types/node | MIT | verify with syft |
| @types/pg | MIT | verify with syft |
| @zip.js/zip.js | MIT | verify with syft |
| axe-core | MPL-2.0 | verify with syft |
| better-auth | MIT | verify with syft |
| comlink | Apache-2.0 | verify with syft |
| dexie | Apache-2.0 | verify with syft |
| docx | MIT | verify with syft |
| drizzle-orm | Apache-2.0 | verify with syft |
| echarts | Apache-2.0 | verify with syft |
| exceljs | MIT | verify with syft |
| graphile-worker | MIT | verify with syft |
| hono | MIT | verify with syft |
| jsdom | MIT | verify with syft |
| lucide-solid | ISC | verify with syft |
| mammoth | BSD-2-Clause | verify with syft |
| mediabunny | MIT (uncertain) | verify with syft |
| mermaid | MIT | verify with syft |
| onnxruntime-web | MIT | verify with syft |
| oxfmt | MIT | verify with syft |
| oxlint | MIT | verify with syft |
| pdf-lib | MIT | verify with syft |
| pdfjs-dist | Apache-2.0 | verify with syft |
| pg | MIT | verify with syft |
| playwright | Apache-2.0 | verify with syft |
| postal-mime | MIT | verify with syft |
| pptxgenjs | MIT | verify with syft |
| prom-client | Apache-2.0 | verify with syft |
| shiki | MIT | verify with syft |
| solid-js | MIT | verify with syft |
| tesseract.js | Apache-2.0 | verify with syft |
| tldts | MIT | verify with syft |
| tsx | MIT | verify with syft |
| typescript | Apache-2.0 | verify with syft |
| vite | MIT | verify with syft |
| vite-plugin-solid | MIT | verify with syft |
| vitepress | MIT | verify with syft |
| vitest | MIT | verify with syft |
| vitest-axe | MIT | verify with syft |
| vue | MIT | verify with syft |
| whisper.cpp | MIT | verify with syft |
| wxt | MIT | verify with syft |
| zip | MIT | verify with syft |
| zod | MIT | verify with syft |

## Native / non-npm components

| Component | License | Verification |
| --- | --- | --- |
| PostgreSQL 18 | PostgreSQL License | verify with syft; deploy-time dependency |
| Garage | AGPL-3.0 (verify) | verify with syft; deploy-time dependency |
| Caddy | Apache-2.0 | verify with syft; deploy-time dependency |
| Python dependencies (Pydantic and engine deps) | MIT / Apache-2.0 as declared per `pyproject.toml` | verify with syft or `uv` lock metadata |
| Rust crates (`redb` and others) | As declared per `Cargo.toml` / `Cargo.lock` | verify with syft or `cargo` metadata |

## How to regenerate

```sh
# In CI: anchore/sbom-action@v0 writes frithward.spdx.json and uploads it as
# the "frithward-spdx" artifact on every run. Locally, with syft installed:
syft . -o spdx-json > frithward.spdx.json
```

Review the SBOM plus each model card before publishing a release. Do not treat this table as complete: version ranges (`latest`, `^`) mean the resolved license set can change between installs.
