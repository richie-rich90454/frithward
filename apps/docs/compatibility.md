# Compatibility

These tables describe what the repository actually targets and what has been verified. "Not verified" means there is no test evidence in this repository — it is not a claim of support. Nothing here is a guarantee of detection accuracy.

## Browser-only operation

The built web app is a static site. `apps/web/src` makes no `fetch()` calls, so no Hono service is needed at runtime: caption editing and export, document generation (docx/pdf/xlsx/pptx/zip), diagrams, charts, media inspection, scam/URL/QR analysis, privacy and provenance inspection, the eight-language UI, and the accessibility checks all execute in the browser. **No backend, native install, or global install is required to run it.** Building it once needs Node.js and pnpm locally; hosting it needs only a static file server.

`e2e/browser-only.spec.ts` verifies this against `vite preview`, which serves only `apps/web/dist`. It asserts that all routes render with no page errors and no `/api/` request, that a caption project's `localStorage` record survives a reload, that core routes render with every cross-origin request blocked, and that loading the app makes no requests to external hosts.

### What runs without a network call

Once the page and its same-origin assets have loaded, every implemented feature runs locally: editing captions, generating documents, rendering diagrams and charts, inspecting media metadata, analysing text/URLs/QR content, reading provenance records, and switching languages. No analysis result is uploaded.

Reloading while disconnected is a separate guarantee. It depends on the service worker and browser caching and is **not** asserted by the tests above; treat offline navigation as unverified in this checkout.

### Assets you must supply

| Feature | Requirement | Honest status |
| --- | --- | --- |
| Caption generation | Default: bundled `browser-whisper` on WebGPU (Chrome/Edge 113+, Safari 18+); decodes normal uploads locally and downloads ONNX weights from Hugging Face on first use, caching them in OPFS, so one network run is needed but audio is never uploaded. Optional Advanced path: a user-supplied Whisper WASM runtime URL plus a model (place `whisper-tiny.bin` in `apps/web/public/models/` and rebuild, or supply a model URL), taking 16-bit little-endian mono PCM at 16 kHz | Stored captions are edited and exported locally; the advanced path downloads no model automatically |
| OCR | tesseract.js worker language data. `eng.traineddata.gz` is bundled at same-origin `/tessdata`; other languages need a file placed in `apps/web/public/tessdata` and a rebuild | English OCR data is local; nothing is downloaded at runtime. Additional languages are not shipped |
| Local model inference | Model weights and model cards | Model cards are not shipped yet; the manager inventories metadata, it does not download weights |

### Browser APIs that gate features

The minimum versions below are commonly cited baselines, **not** a browser matrix verified in this repository; E2E coverage here runs in Chromium only.

| API | Gates | Minimum version | Notes |
| --- | --- | --- | --- |
| `SharedArrayBuffer` | whisper.cpp / threaded WASM transcription | Requires cross-origin isolation: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` | Vite dev/preview and the shipped Caddyfile set these headers; configs for Netlify/Cloudflare/Vercel are also shipped. See cross-origin isolation below |
| OPFS (Origin Private File System) | local asset storage in the media runtime | Chrome 86, Firefox 111, Safari 15.2 | Storage is per-origin in the browser |
| WebCodecs | local audio/video transcoding | Chrome 94, Safari 16.4 | Firefox support is not assumed |
| WebGPU | default `browser-whisper` transcription and GPU detection | Chrome 113, Safari 18+ | Required for zero-config transcription (first run downloads weights); caption editing/export and the rest of the app still work without it |
| WebAssembly SIMD | WASM-based media and inference libraries | Modern evergreen browsers | Older browsers without SIMD cannot run the local inference path |
| `localStorage` | theme preference, scam recent checks, incident export history | Modern evergreen browsers | Theme cycles system/light/dark and persists as `frithward.theme`; data stays on this origin |
| IndexedDB | browser-local Case store (`frithward-cases`, `cases` store) | Chrome 24, Firefox 15, Safari 10.1 | Cases are saved locally through Dexie and are never uploaded; unavailable environments get an explicit error |
| `crypto.subtle` (Web Crypto) | SHA-256 hashing of provenance artifacts and incident evidence | Chrome 37, Firefox 34, Safari 11 | Hashing runs in the browser; no server call. Missing `crypto.subtle` disables evidence hashing with an explicit error |

None of these gates requires a backend or a native install. There is no server-side fallback: where an API is missing, the affected local feature is unavailable. Cryptographic C2PA verification is one such missing feature: the native `@contentauth/c2pa-node` SDK cannot run in the browser, so manifest fields are read and reported as unverified, and binary files with no locally readable manifest return an explicit "unavailable" result rather than "valid".

### Cross-origin isolation and static hosts

`SharedArrayBuffer` is exposed only in a cross-origin isolated page, and COOP/COEP response headers can only be set by the host — no `<meta>` tag or service worker can. The build ships config for Netlify/Cloudflare Pages (`apps/web/public/_headers`, `apps/web/netlify.toml`), Vercel (`apps/web/vercel.json`), and self-hosted Caddy (`infrastructure/deployment/Caddyfile`); `apps/web/public/hosting-headers.json` lists the exact name/value pairs for any other host.

A host that cannot set arbitrary response headers (for example GitHub Pages) still runs every non-`SharedArrayBuffer` feature normally; only Whisper pthreads transcription is unavailable. The browser-whisper/WebGPU transcription path does not need COOP/COEP. All runtime assets are same-origin, so `require-corp` blocks nothing and is kept over `credentialless` for broader browser support. `getIsolationStatus()` in `apps/web/src/offline/isolation.ts` exposes the check at runtime.

## Accessibility and dark mode

The theme toggle offers `system`, `light`, and `dark`. The choice persists in `localStorage` under `frithward.theme`; on `system`, the resolved theme follows `prefers-color-scheme` and updates live. `e2e/theme.spec.ts` verifies the cycle, persistence across reload, and system-preference changes. `e2e/mobile.spec.ts` and `e2e/theme.spec.ts` verify a 375px viewport across the main routes with no horizontal overflow, a reachable theme toggle, and 44px touch targets on home buttons. `e2e/accessibility.spec.ts` runs axe-core checks. The docs site uses VitePress `appearance: auto` with a dark accent palette.

Accessibility and dark mode are verified in Chromium only; screen-reader testing and real mobile devices are not covered in this checkout.

## Browser compatibility (local-first path)

The web app ships WASM-based libraries (`onnxruntime-web`, `@ffmpeg/ffmpeg`, `tesseract.js`, `@mediapipe/tasks-vision`, `@mlc-ai/web-llm`) and requires a cross-origin-isolated page for some of them. Caddy sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` for that reason.

| Browser | Level | Status | Notes |
| --- | --- | --- | --- |
| Chromium (Chrome, Edge) current | Recent desktop | E2E coverage | Playwright Chromium runs the theme, mobile-layout, accessibility, and browser-only suites; no manual browser matrix has been executed |
| Firefox current | Recent desktop | Not verified | WASM SIMD supported; cross-origin isolation behavior not tested here |
| Safari current (macOS) | Recent desktop | Not verified | WASM threading / WebGPU support varies by version; not tested here |
| Mobile viewport (375 × 812) | Responsive layout in Chromium | Verified | `e2e/mobile.spec.ts` checks 16 routes for no horizontal overflow and a reachable theme toggle; `e2e/theme.spec.ts` checks 44px touch targets |
| Mobile browsers (real devices) | iOS Safari / Android Chrome | Not verified | No real-device or Safari-mobile coverage in this repository |
| Older browsers without WASM SIMD | — | Not supported | Core local inference path will not run |

There is no browserslist configuration in this repository, so build targets are Vite defaults. Treat the table as guidance, not a tested contract.

## Operating systems (self-hosted)

| OS | Application processes | Caddy / PostgreSQL 18 / Garage | Notes |
| --- | --- | --- | --- |
| Linux (Ubuntu 24.04+, Debian 12+) | Supported by commands as written | Available from upstream | Primary CI platform is `ubuntu-latest` |
| macOS (current) | Supported by commands as written | Available from upstream | CI runs on `macos-latest` |
| Windows 10/11 (x64) | Supported via PowerShell equivalents | Available from upstream | CI runs on `windows-latest`; paths need `\` separators |

CI exercises format, lint, typecheck, unit tests, and E2E on all three OSes in the `check` job. Service startup on each OS is documented but not automated.

## Deployment targets

| Target | How it runs | Notes |
| --- | --- | --- |
| Browser-only static host | Build `@frithward/web` and serve `apps/web/dist` on any static host | Default path: no backend, native install, or global install. See the deployment guide. |
| Self-hosted processes behind Caddy | Run the Hono services with local pnpm scripts behind Caddy | Services run TypeScript source via workspace-local `tsx`; there is no compiled server bundle. |
| Optional infrastructure | Caddy, PostgreSQL 18, Garage, pgBackRest, Prometheus/otelcol/Loki | Host prerequisites installed by the operator, not project dependencies; no container runtime is used. |

This describes the execution shapes present in this repository; it is not a certified support matrix. The verification notes above still apply.

## Runtime versions

| Component      | Target     | Enforced where                                               |
| -------------- | ---------- | ------------------------------------------------------------ |
| Node.js        | `>=26 <27` | Root `package.json` `engines`; CI `setup-node`               |
| pnpm           | 12.14.0    | Root `package.json` `packageManager`; CI `pnpm/action-setup` |
| Python engines | 3.12+      | Each `engines/*/pyproject.toml` `requires-python`; CI `uv`   |
| Rust crates    | 1.99.1     | `rust-toolchain.toml`; CI Rust toolchain action              |
| PostgreSQL     | 18         | Deployment docs and `infrastructure/database/0001_init.sql`  |

## Model compatibility

Engines now split into two honest groups. Several perform deterministic local computation (reviewed scam patterns, literal document redaction, EXIF/GPS inspection, PCM gain, language heuristics, resize and trim geometry, JSON provenance parsing, and caller-supplied PyTorch image inference); the rest return `status="unavailable"` with a reason rather than fabricating results. No detector, OCR, transcription, generation, or protection model ships with the repository, so model-backed detection remains unavailable. Candidate models below are research targets, not shipped weights. See [Engines](/engines) for the per-engine table.

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
