# Frithward

Keep people safe. Keep media honest.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-2f6f9f.svg)](LICENSE)
[![Node 26](https://img.shields.io/badge/node-26-3c873a.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/package%20manager-pnpm-f9bc01.svg)](https://pnpm.io/)
[![CI](https://github.com/richie-rich90454/frithward/actions/workflows/ci.yml/badge.svg)](https://github.com/richie-rich90454/frithward/actions/workflows/ci.yml)

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
| Share check | Review a file for privacy exposure before sharing | Runs locally with no network call |
| Scam check | Inspect messages, URLs, and QR content against reviewed patterns and give guided guidance | Pattern-based guidance, not a verdict; the hosted API and the local path share the same domain logic |
| C2PA inspection | Read embedded C2PA manifests and show signature status in plain language | Cryptographic signature verification requires the native `@contentauth/c2pa-node` SDK, which is not built in this checkout |
| Provenance | Record and verify provenance records with human-readable status | Cryptographic verification depends on the native C2PA SDK |
| Local model manager | Inventory installed models, sizes, stages, licenses, and limitations | Manages metadata; it does not download or run models itself |
| Internationalization | English, Chinese, Spanish, French, German, Hindi, Japanese, and Arabic, with right-to-left layout for Arabic | Translations are community maintained |
| Python engines | 18 packages across audio, image, video, document, text, and provenance | Interface scaffolds with ports, policies, and CLI contracts today; no model inference is wired in |
| Rust crates | CLI, media, privacy, provenance, runtime, and the Tauri desktop shell | Five shared crates plus the desktop shell under `apps/desktop` |
| HTTP services | Six Hono services: API (3000), orchestrator (3001), media worker (3002), inference worker (3003), community (3004), incident (3005) | Most expose health endpoints; the API adds scam analysis and a session probe |

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
