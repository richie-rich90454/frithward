# Frithward

Keep people safe. Keep media honest.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-2f6f9f.svg)](LICENSE) [![Node 26](https://img.shields.io/badge/node-26-3c873a.svg)](https://nodejs.org/) [![pnpm](https://img.shields.io/badge/package%20manager-pnpm-f9bc01.svg)](https://pnpm.io/) [![CI](https://github.com/richie-rich90454/frithward/actions/workflows/ci.yml/badge.svg)](https://github.com/richie-rich90454/frithward/actions/workflows/ci.yml)

Deepfakes, scams, and privacy exposure travel faster than the people who have to deal with them. A forged voice can authorize a payment, a photo can reveal a location, and a convincing message can empty a savings account. Frithward is an open-source toolkit for inspecting media, checking provenance, and spotting scams. It is built so the default is to work on your own device, with no account and no upload. The goal is a precision civic instrument: exact about what it does, explicit about what it does not, and never a substitute for human judgement.

## Why Frithward

1. **Local first.** Processing runs on the user's device. Nothing leaves it without an explicit, informed action.
2. **Evidence, not verdicts.** A score is a signal for a person to review, never proof of authenticity or an accusation about someone.
3. **Honest limits.** Report measured results only, write unmeasured data as "not measured", and show limitations beside every claim.
4. **Open and auditable.** Apache-2.0 code, explicit contracts, and module boundaries enforced by tooling instead of good intentions.
5. **For people, not operators.** Plain language, accessibility, eight languages, and full self-hosting; the software stays useful without any hosted service.
6. **Safety over novelty.** No impersonation tools, no non-consensual identity data, and no consequential decision made automatically.

## What works today

This is the current state of the repository, not a roadmap. Capabilities are described as they are implemented, and partial areas are labelled. The monorepo has 46 pnpm workspaces, 18 Python engine packages, six Rust crates, six HTTP services, and eight interface languages.

| Capability | What works today | Honest note |
| --- | --- | --- |
| Caption studio | Create subtitle segments in the browser, edit timing and text, and export to common formats | Transcription runs through browser adapters; quality depends on the model in use |
| Audio, video, image, and document workshops | Local workbenches to inspect, enhance, and redact media, plus document extraction and OCR hooks | Enhancement and detection are experimental, not validated detectors |
| Metadata inspection | Inspect file metadata and flag GPS or location leakage | Reads what is present; it cannot prove what was removed |
| Share check | Read real EXIF/IPTC/PNG metadata from a selected JPEG or PNG, flag GPS/device/time exposure, and download a re-encoded, metadata-stripped copy | Redaction rebuilds the image from decoded pixels; unsupported formats are not silently copied, and no file is uploaded |
| Scam check | Inspect messages, URLs, and QR content with local domain logic plus a reviewed rule catalog (urgency, lookalike domains, homoglyphs, mismatched links, and more), with a guided walkthrough | Pattern-based guidance, not a verdict or a prediction of intent; results stay in local recent checks and can be downloaded as a JSON report |
| C2PA inspection | Read C2PA fields from a supplied manifest and show signature status in plain language | No cryptographic signature verification in the browser; it needs the native `@contentauth/c2pa-node` SDK, which is not built in this checkout |
| Provenance | Inspect a JSON manifest or a selected file locally and report what is actually present | Binary files with no locally readable manifest return an honest "unavailable" result, never "valid"; a SHA-256 hash of the file is computed and saved with the case |
| Case store | Browser-local cases in IndexedDB (`frithward-cases`) with autosave and the eight most recent cases on the home page; provenance checks save a case with a SHA-256 artifact hash | Scam checks keep their own recent-check list in `localStorage`; neither path uploads anything. The hosted `/api/cases` store is opt-in |
| Incident response | Build a timeline, import a downloaded scam report as evidence, hash files with `crypto.subtle` SHA-256, and export an evidence report | Hashes are integrity records for human review, not proof of origin; export history is kept in `localStorage` |
| Dark mode and mobile layout | Theme toggle cycles system / light / dark, follows `prefers-color-scheme` on "system", and persists in `localStorage`; the docs site has a dark palette | Verified in Chromium at a 375px viewport across 16 routes (`e2e/mobile.spec.ts`) with no horizontal overflow; real phones are not in the matrix |
| Internationalization | English, Chinese, Spanish, French, German, Hindi, Japanese, and Arabic, with right-to-left layout for Arabic | Translations are community maintained |
| Browser extension | Analyze the current page or a selection locally, keep a recent-check history in `browser.storage.local`, and open the text in the web app via a `/check#text=` deep link | The web-app URL defaults to `http://localhost:4173`; set `VITE_FRITHWARD_WEB_URL` at build time for a real deployment; no analysis is uploaded |
| Desktop app | Renders the full toolkit — the same pages as the web app, including the case store and theme toggle | Frontend build only; the native Tauri bundle needs the host-installed Tauri CLI |
| Public proof page | Reads a selected media file or manifest JSON in the browser, computes its SHA-256, and summarizes manifest fields | No upload and no cryptographic verification; missing manifests are reported as unavailable |
| Docs site | VitePress docs with a system-following light/dark appearance and a dark accent palette | Dark mode uses VitePress's built-in appearance control |
| Python engines | 18 packages across audio, image, video, document, text, and provenance | Several now perform deterministic local computation (PCM gain, resize geometry, language heuristics, trim geometry); model-backed detection remains unavailable |
| Rust crates | CLI, media, privacy, provenance, runtime, and the Tauri desktop shell | Five shared crates plus the desktop shell under `apps/desktop` |
| HTTP services | Six Hono services: API (3000), orchestrator (3001), media worker (3002), inference worker (3003), community (3004), incident (3005) | The API adds session-guarded, opt-in `/api/cases` CRUD; community/incident reports persist only when `DATABASE_URL` is set. Worker metrics are minimal |

Honest limits across the whole table: there is no cryptographic C2PA verification in the browser, detection scores are evidence for a person to review rather than proof of identity or authenticity, and unmeasured results are labelled "not measured". Nothing is uploaded unless you explicitly use a hosted service.

## Daily workflow

A typical local session follows these steps, with no account and no upload:

1. **Check a message** — paste a message, link, or QR payload on `/check`. Local rules flag suspicious wording and links; the result is kept in browser-local recent checks, and you can download a scam report JSON.
2. **Saved case** — provenance inspections save a case with a SHA-256 artifact hash to the shared IndexedDB Case store; the eight most recent cases appear on the home page. (Scam checks use their own `localStorage` recent-check list.)
3. **Check a file** — on `/protect`, inspect a JPEG or PNG for EXIF/GPS and other exposure, then download a re-encoded copy with embedded metadata stripped. The original is never modified.
4. **Hashed evidence** — on `/respond`, import the downloaded scam report or add files as evidence; each item is hashed with SHA-256 in the browser.
5. **Exported report** — export the evidence report JSON. A hash of each export is recorded in local report history for later verification.

## Quick start

Requires Node.js 26 and pnpm 10 or newer. No Docker or container runtime is needed. The same commands work in PowerShell on Windows and in a shell on macOS and Linux.

```text
pnpm install
pnpm run build          # needed once before start:web on a clean checkout
pnpm run start:web      # http://localhost:4173
pnpm run start:api      # http://localhost:3000
```

For live development, use `pnpm --filter @frithward/web run dev` on port 5173. The API runs through `tsx` and needs no build step; the health endpoint works locally without a database, while deployed or authenticated use needs `DATABASE_URL` and `BETTER_AUTH_SECRET`.

Verify a change with:

```text
pnpm run check          # format check, lint, boundaries, self-tests, typecheck, unit tests
pnpm run test:e2e       # Playwright end-to-end and axe-core accessibility checks
```

Install the Playwright browsers once with `pnpm exec playwright install` before the first end-to-end run.

### Use it in a browser only

No backend, native install, or global install is needed to run the web app. From the repository root:

```sh
pnpm install
pnpm --filter @frithward/web run build
# serve apps/web/dist with any static host (for example `pnpm --filter @frithward/web run start`
# or Caddy file_server), then open it in a browser
```

On Windows the folder is `apps\web\dist`. The optional Hono services are for organizations that want shared processing; they are not part of this path because `apps/web/src` makes no `fetch()` calls. The browser-only path is unchanged: caption generation defaults to the bundled browser-whisper engine on WebGPU (first run downloads weights, no audio is uploaded), while the optional Advanced path accepts a user-supplied Whisper WASM runtime plus a model. English OCR data is bundled; other languages need a local file. Building still needs Node.js 26 and pnpm locally. See [compatibility.md](docs/compatibility.md) for details and browser API minimums, and the [deployment guide](docs/deployment.md) for self-hosting, environment variables, and host prerequisites. `e2e/browser-only.spec.ts` verifies static-only operation; offline reloads via service worker/cache are not asserted there.

## Architecture

The dependency direction is inward. Each package separates five layers:

```text
presentation  ->  application  ->  domain  <-  infrastructure
                       |                         ^
                       +--------- ports --------+
```

| Layer | Responsibility | May import |
| --- | --- | --- |
| `presentation` | Controllers, presenters, view models, TSX rendering | application, domain, view models |
| `application` | Use cases, job handlers, orchestration | domain, ports |
| `domain` | Entities, value objects, policies, invariants | nothing outside the package |
| `ports` | Interfaces for external capabilities | domain types |
| `infrastructure` | Adapters: IndexedDB, HTTP, storage, engines | ports, domain |

These boundaries are enforced by tooling, not by convention, and that is a deliberate differentiator. `scripts/check-boundaries.mjs` classifies every `.ts` and `.tsx` file by path and fails the build on forbidden imports: domain into infrastructure, application into infrastructure or TSX, presentation into infrastructure, TSX into a logic layer, and frontend into a backend service. oxlint adds `import/no-restricted-paths`, `import/no-cycle`, and `import/no-relative-packages`. The boundary checker ships with 11 self-tests, and `pnpm run check` runs them along with the rest of the suite.

TypeScript and SolidJS provide the application surface, Hono services provide explicit hosted execution, Python engines provide model-backed analysis, and Rust crates provide CLI and media or provenance primitives. Local execution is the default; hosted execution is explicit and opt-in.

## Repository layout

```text
apps/            web, desktop (Tauri), browser extension, public proof, docs site
packages/        shared domain, application, ports, infrastructure, presentation code
services/        six Hono services: API, orchestrator, media/inference workers, incident, community
tools/           user-facing tool facades over shared packages
engines/         18 Python engine packages
crates/          five shared Rust crates (plus the Tauri shell under apps/desktop)
research/        model notes, datasets, and the benchmark harness
infrastructure/  schema, deployment, monitoring, security, and storage configuration
docs/            architecture, engineering, API, privacy, security, research, community, governance
scripts/         module-boundary checker and its self-tests
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, validation commands, the layer rules, and commit conventions. Please read the [code of conduct](CODE_OF_CONDUCT.md) first.

## Security

Report vulnerabilities privately, not in a public issue. See [SECURITY.md](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE). Model weights, datasets, and documentation keep their stated licenses.

## Creator

Created by Richard Jiang. Repository: https://github.com/richie-rich90454/frithward
