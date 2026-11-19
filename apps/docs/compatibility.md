# Compatibility

These tables describe what the repository actually targets and what has been verified. "Not verified" means there is no test evidence in this repository — it is not a claim of support. Nothing here is a guarantee of detection accuracy.

## Browser compatibility (local-first path)

The web app ships WASM-based libraries (`onnxruntime-web`, `@ffmpeg/ffmpeg`, `tesseract.js`, `@mediapipe/tasks-vision`, `@mlc-ai/web-llm`) and requires a cross-origin-isolated page for some of them. Caddy sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` for that reason.

| Browser | Level | Status | Notes |
| --- | --- | --- | --- |
| Chromium (Chrome, Edge) current | Recent desktop | Not verified | E2E tests run in Playwright Chromium; no manual browser matrix has been executed |
| Firefox current | Recent desktop | Not verified | WASM SIMD supported; cross-origin isolation behavior not tested here |
| Safari current (macOS) | Recent desktop | Not verified | WASM threading / WebGPU support varies by version; not tested here |
| Mobile browsers | iOS Safari / Android Chrome | Not verified | No mobile E2E coverage |
| Older browsers without WASM SIMD | — | Not supported | Core local inference path will not run |

There is no browserslist configuration in this repository, so build targets are Vite defaults. Treat the table as guidance, not a tested contract.

## Operating systems (self-hosted)

| OS | Application processes | Caddy / PostgreSQL 18 / Garage | Notes |
| --- | --- | --- | --- |
| Linux (Ubuntu 24.04+, Debian 12+) | Supported by commands as written | Available from upstream | Primary CI platform is `ubuntu-latest` |
| macOS (current) | Supported by commands as written | Available from upstream | CI runs on `macos-latest` |
| Windows 10/11 (x64) | Supported via PowerShell equivalents | Available from upstream | CI runs on `windows-latest`; paths need `\` separators |

CI exercises format, lint, typecheck, unit tests, and E2E on all three OSes in the `check` job. Service startup on each OS is documented but not automated.

## Runtime versions

| Component      | Target     | Enforced where                                               |
| -------------- | ---------- | ------------------------------------------------------------ |
| Node.js        | `>=26 <27` | Root `package.json` `engines`; CI `setup-node`               |
| pnpm           | 12.14.0    | Root `package.json` `packageManager`; CI `pnpm/action-setup` |
| Python engines | 3.12+      | Each `engines/*/pyproject.toml` `requires-python`; CI `uv`   |
| Rust crates    | 1.99.1     | `rust-toolchain.toml`; CI Rust toolchain action              |
| PostgreSQL     | 18         | Deployment docs and `infrastructure/database/0001_init.sql`  |

## Model compatibility

Most engines are interface scaffolds: they validate input and return structurally correct results, but model-backed inference is not wired. Candidate models below are research targets, not shipped weights.

| Area | Candidate(s) | Dataset | Status |
| --- | --- | --- | --- |
| Audio detection | AASIST, RawNet2 | ASVspoof | Candidate; license review required; not verified |
| Image detection | Xception, EfficientNet, ViT | FaceForensics++, DFDC, Celeb-DF | Candidate; license review required; not verified |
| Video detection | Temporal / frame-level classifiers | Cross-dataset evaluation | Candidate; not verified |
| Multimodal detection | Audio-video synchronization models | Task-specific | Candidate; not verified |
| Audio protection | No fixed candidate | Consented voice data only | Not selected |
| Image protection | No fixed candidate | Consented face data only | Not selected |
| Scam detection | Deterministic patterns + reviewed examples | No victim data | Pattern logic implemented; accuracy not measured |

A model may only reach `stable` through the stage gates in [Governance](/governance), which require a model card with all 13 fields and measured results. Unmeasured results are "not measured".

## Hardware

| Path | Requirement | Status |
| --- | --- | --- |
| Browser local inference | WASM SIMD; cross-origin-isolated page; suggested 8 GB RAM | Not benchmarked; no minimum device profile measured |
| GPU / WebGPU acceleration | Optional, adapter-dependent | Not verified; do not assume acceleration |
| Hosted Python engines | Python 3.12+, CPU; model-specific acceleration may be needed | Engines are scaffolds; real model requirements unknown until weights land |
| Rust crates | Rust 1.99.1, standard CPU | Built and tested in CI |

Detection scores are evidence for human review, never proof of identity or authenticity. Performance varies across datasets, languages, and recording conditions.
