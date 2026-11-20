# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow semantic versioning. Security-only entries are recorded in [SECURITY_CHANGELOG.md](SECURITY_CHANGELOG.md).

## [Unreleased]

### Added

- Root `db:migrate`, `start:worker`, and `start:docs` scripts and a `.env.example` template covering the environment variables used by the services and Caddy.
- Environment-variable, docs-site, desktop, and extension sections in the self-hosting guide, plus a "Deployment targets" section in the compatibility guides.
- Theme toggle with `system`, `light`, and `dark` preferences, persisted to `localStorage` and following `prefers-color-scheme` on `system`; the VitePress docs site has a dark accent palette.
- Mobile layout coverage: `e2e/mobile.spec.ts` checks 16 routes at a 375px viewport with no horizontal overflow and a reachable theme toggle; `e2e/theme.spec.ts` checks theme cycling, persistence, and 44px touch targets.
- Browser-local Case store backed by IndexedDB (`frithward-cases`) with autosave, validation through the shared `Case` contract, and the eight most recent cases shown on the home page. Provenance checks save a case with a SHA-256 artifact hash computed via `crypto.subtle`.
- Real file-based Share Check: a JPEG/PNG EXIF, IPTC, and PNG metadata parser that reports GPS coordinates and device/time fields, plus redaction that re-encodes the image from decoded pixels so embedded metadata is not carried into the download.
- File-based Provenance check: JSON manifests are parsed locally and binary files are inspected locally; when no embedded manifest can be read the result is an explicit "unavailable" view rather than a validity claim.
- Reviewed rule-based scam pattern catalog (urgency, payment, credential, lookalike domains, homoglyphs, mismatched links, and more) alongside the existing `security-core` analysis, with local recent checks and a downloadable scam report JSON.
- Incident timeline support for importing a downloaded scam report as evidence, hashing files with browser `crypto.subtle` SHA-256, exporting an evidence report, and keeping a local export-history log.
- Browser extension: local heuristic analysis of the current page or a text selection, a recent-check history in `browser.storage.local`, and an "Open in Frithward" deep link to `/check#text=`.
- Desktop frontend renders the full toolkit (the same pages as the web app, including the case store and theme toggle); the public-proof page reads a selected file or manifest locally, hashes it, and summarizes manifest fields without uploading.
- Persistent storage is opt-in through `DATABASE_URL`: migration `0002_cases_and_reports.sql` adds `cases`, `community_reports`, and `incident_reports`, and `pnpm run db:migrate` now applies both migrations. The API mounts session-guarded `/api/cases` CRUD endpoints and the community/incident services use database repositories when a URL is configured.

### Changed

- Deployment and compatibility docs now describe the default browser-whisper/WebGPU caption path (first run downloads weights) and the optional user-supplied WASM path.
- Corrected the security, API, and privacy docs: secrets come from the environment only; there is no hardcoded auth secret or built-in development DSN, and `BETTER_AUTH_SECRET` is required when `NODE_ENV=production`.
- Removed the third-party static-server and local Syft instructions: static hosting uses workspace-local tooling, and the SPDX SBOM is generated in CI by `anchore/sbom-action`.
- Documented that infrastructure binaries are host prerequisites and that services run TypeScript source through workspace-local `tsx` (no compiled server bundle).
- API, deployment, security, and privacy docs now reflect the session-guarded Case endpoints, local-only case storage, and the two-migration `db:migrate` flow.
- Engine status wording is now conservative: several engines perform deterministic local computation, while model-backed detection remains unavailable.

### Fixed

- Share Check no longer relies on manually selected checkboxes alone: selecting a real file populates the inspection view from parsed metadata, and redaction produces a downloadable sanitized copy with an honest label for every method.
- Provenance results for binary files without a locally readable manifest no longer imply a valid signature; missing data is listed and the summary states that verification is unavailable.
- Documentation no longer claims that all engines are scaffolds or that the API mounts only three route groups, both of which were out of date with the source.

### Honest notes

- No cryptographic C2PA verification runs in the browser. The native `@contentauth/c2pa-node` SDK is not built in this checkout, so signature, certificate-chain, and asset-hash claims are read from manifests and reported as unverified.
- Worker metrics are minimal: the API exposes `http_request_duration_seconds` and `analyses_total`, while community and incident expose only `service_up` and process uptime. There is no full RED/USE metric suite.
- Trivy is report-only in CI (`exit-code: 0`), so findings stay visible without blocking the build. The local `infrastructure/security/trivy.yaml` still fails on CRITICAL/HIGH findings.

## [0.1.0] — 2026-11-20

First documented release baseline. This entry describes what is actually present in the repository at this version; it is not a claim of feature completeness.

### Added

- Local-first web application with caption studio, media check, scam check, and incident timeline surfaces. Default processing stays in the browser; no upload occurs without explicit user direction.
- 18 Python engine packages under `engines/` with Pydantic request/response contracts, tests, and per-engine virtual environments. Target Python 3.12+.
- Five Rust crates under `crates/`: CLI, media, privacy, provenance, and runtime. Toolchain pinned in `rust-toolchain.toml`.
- Service entrypoints for API, orchestrator, media worker, inference worker, community, and incident, invoked through the root `pnpm start:*` scripts.
- PostgreSQL 18 schema in `infrastructure/database/0001_init.sql` and Garage object-storage configuration.
- Caddy site block with automatic HTTPS, COOP/COEP headers, `/api/*` reverse proxy, and a static web root. No container runtime is used.
- Monitoring configuration for Prometheus, OpenTelemetry Collector, Loki, and Grafana, including a Frithward dashboard with HTTP request duration and analyses total panels.
- pgBackRest configuration with full/differential retention and zstd compression, plus documented restore steps.
- CI matrix (format, lint, boundary checks, typecheck, unit tests, web build, E2E) on Linux, macOS, and Windows; separate Python, Rust, security (gitleaks, Trivy, Syft, release-only Cosign), and model-card jobs.
- Governance and policy set: privacy, security, threat model, governance, model, dataset, research, and community documents.
- Self-hosting and compatibility guides, a security changelog, and a third-party license inventory.

### Changed

- Expanded `PRIVACY.md` with a data inventory, retention, deletion/DSR process, and an explicit "no subprocessors for local execution" statement.
- Expanded `THREAT_MODEL.md` with a threat table (IDs, severity, mitigations) and a text data-flow diagram.
- Expanded `GOVERNANCE.md` with model release stage gates and reviewer ownership.

### Known limitations

- Most Python engines are interface scaffolds: they validate input and return structurally correct results, but model-backed inference is not wired. Complexity tables describe intended implementations.
- `models/manifest.json` and model cards are owned by a separate workstream and are not present in this baseline. `node scripts/check-model-cards.mjs` therefore fails until they land — this is deliberate, not a masked failure.
- No model performance numbers are published. Unmeasured results are "not measured"; detection scores are evidence for human review, never proof of identity or authenticity.
- Cosign SBOM signing is guarded to release tags and skips with a clear warning when `COSIGN_KEY`/`COSIGN_PASSWORD` secrets are absent. No release artifacts are signed in this baseline.
- `pnpm run db:migrate`, the aggregate `pnpm run start:worker` script, and `scripts/migrate.mjs` belong to parallel workstreams; the deployment guide documents them when present and provides a manual fallback for migrations.
- Browser, OS, model, and hardware compatibility entries are marked "not verified" where no test evidence exists. There is no measured minimum device profile.
- Docker is intentionally not used; there is no `Dockerfile` or `docker-compose.yml`. Self-hosting relies on plain `pnpm start:*` commands and Caddy.
- SBOM and license review relies on the generated SPDX file; `THIRD_PARTY_LICENSES.md` entries are best-effort and marked "verify with syft".
