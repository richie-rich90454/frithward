# Self-hosting and deployment

Frithward is self-hosted with plain processes. **Docker is intentionally not used**: there is no `Dockerfile` and no `docker-compose.yml`. Install the services on the host (or your own process manager), keep them behind Caddy, and point them at PostgreSQL 18 and Garage. Caddy terminates TLS with automatic HTTPS.

These commands are cross-platform. Paths use `/`; on Windows use the equivalent under PowerShell (for example `.\apps\web\dist`). Run all `pnpm` commands from the repository root.

## Browser-only quick start

The web app runs as a static site with **no backend, no native installs, and no global installs**. Building it once needs Node.js and pnpm locally; serving and using it needs only a static file server. From the repository root:

```sh
pnpm install
pnpm --filter @frithward/web run build
# serve apps/web/dist with any static host, then open it in a browser
```

Serve `apps/web/dist` with a static host: `pnpm --filter @frithward/web run start` (the local Vite preview on port 4173) or Caddy's `file_server` (section 4). GitHub Pages works too. On Windows the folder is `apps\web\dist`. The same commands work in PowerShell, macOS, and Linux. Docker is intentionally not used anywhere in this repository.

The optional Hono services (API, orchestrator, media/inference workers, community, incident) are for organizations that want shared or server-side processing. They are **not** part of this path: `apps/web/src` contains no `fetch()` calls, so caption editing and export, document generation, diagrams, charts, media tooling, analysis, and provenance inspection all run in the browser. Caption generation uses the bundled `browser-whisper` engine on WebGPU (Chrome/Edge 113+, Safari 18+) by default; the first run downloads ONNX speech-model weights from Hugging Face and caches them in OPFS, so it needs network once but never uploads audio. Only the optional Advanced path needs a user-supplied Whisper WASM runtime plus a model (a local `whisper-tiny.bin` or a URL). Non-English OCR needs extra language data placed in `apps/web/public/tessdata`; see [compatibility.md](/compatibility) for the exact list and browser API minimums.

`e2e/browser-only.spec.ts` exercises this static build with `vite preview` and proves there are no `/api/` calls, no external requests, and browser-local persistence. Offline reloads depend on service-worker/browser caching and are not asserted by that suite.

`e2e/theme.spec.ts` and `e2e/mobile.spec.ts` additionally verify the system/light/dark theme toggle (persisted in `localStorage`) and a 375px viewport layout across 16 routes with no horizontal overflow. Cases and recent-check history stay in the browser (`IndexedDB` and `localStorage`); nothing is uploaded from this path.

### Cross-origin isolation (COOP/COEP) headers

Whisper pthreads transcription needs `SharedArrayBuffer`, which browsers expose only on a cross-origin isolated page. That requires three response headers from the host:

| Header                         | Value          |
| ------------------------------ | -------------- |
| `Cross-Origin-Opener-Policy`   | `same-origin`  |
| `Cross-Origin-Embedder-Policy` | `require-corp` |
| `Cross-Origin-Resource-Policy` | `same-origin`  |

Only the host can set these response headers — a `<meta http-equiv>` tag or a service worker cannot. The build ships ready-to-use config for common static hosts:

- `apps/web/public/_headers` — Netlify and Cloudflare Pages (copied into `dist` on build).
- `apps/web/netlify.toml` — Netlify site configuration.
- `apps/web/vercel.json` — Vercel configuration.
- `infrastructure/deployment/Caddyfile` — self-hosted Caddy (already sets them).
- `apps/web/public/hosting-headers.json` — the exact name/value pairs to copy for any other host.

On a host that cannot set arbitrary response headers (for example GitHub Pages), the app still runs every non-`SharedArrayBuffer` feature normally: caption editing and export, document generation, diagrams, charts, media tooling, analysis, and provenance inspection. Only Whisper pthreads transcription is unavailable there; the browser-whisper/WebGPU transcription path does not need COOP/COEP. All runtime assets are same-origin, so `require-corp` blocks nothing and is kept over `credentialless` for broader browser support. `getIsolationStatus()` in `apps/web/src/offline/isolation.ts` lets the UI check this at runtime.

## 1. Prerequisites

| Component | Version | Notes |
| --- | --- | --- |
| Node.js | 26 (`>=26 <27`) | `nvm install 26 && nvm use 26` (Linux/macOS) or install Node 26 from nodejs.org / `winget install OpenJS.NodeJS` (Windows) |
| pnpm | 12.14.0 | `corepack enable && corepack prepare pnpm@12.14.0 --activate` |
| PostgreSQL | 18 | Official installer or package manager; create an empty database and user |
| Garage | current release | Download the Garage binary; S3-compatible object store |
| Caddy | current release | Download from caddyserver.com; TLS-terminating reverse proxy |
| Python | 3.12+ | Only needed to run the Python engines outside CI; use `uv` |
| Rust | 1.99.1 (see `rust-toolchain.toml`) | Only needed for the Rust crates; use `rustup` |

The infrastructure binaries — Caddy, PostgreSQL, Garage, pgBackRest, and the monitoring tools (Prometheus, OpenTelemetry Collector, Loki) — are **host prerequisites** you install yourself; they are not project dependencies. The no-global-installs constraint applies only to project build/test tooling: pnpm manages the JavaScript dependencies and `uv` manages the Python ones.

## 2. Install and configure

```sh
# From the repository root
pnpm install --frozen-lockfile
pnpm run build
```

Set the environment. On Windows PowerShell use `$env:VAR = "..."`; on Linux/macOS use `export VAR=...`. Do not commit these values. The `.env.example` file at the repository root is a template with every supported variable.

```sh
export NODE_ENV=production
export DATABASE_URL='postgresql://frithward:<password>@127.0.0.1:5432/frithward'
export BETTER_AUTH_SECRET='<a long random secret from: openssl rand -hex 32>'
```

### Environment variables

| Variable | Required? | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | In production | unset (dev behavior) | Set to `production` for the deployed API. In production `BETTER_AUTH_SECRET` is mandatory; otherwise auth uses an ephemeral per-process secret and sessions do not survive a restart. |
| `PORT` | No | 3000 (api), 3001 (orchestrator), 3002 (media-worker), 3003 (inference-worker), 3004 (community), 3005 (incident) | Listen port for each service process. |
| `DATABASE_URL` | For auth, migrations, persisted jobs; opt-in for reports and Cases | none | PostgreSQL connection string; no compiled-in default. Setting it opts into persistent community/incident reports and the session-guarded `/api/cases` CRUD endpoints; without it reports stay in memory and those endpoints return 503 (`EXTERNAL_UNAVAILABLE`). |
| `BETTER_AUTH_SECRET` | Yes when `NODE_ENV=production` | none (ephemeral random secret in dev) | Auth signing secret. Use a long random value (`openssl rand -hex 32`). |
| `CORS_ORIGIN` | No | empty (same-origin only) | Comma-separated origins the API allows through CORS. |
| `ENABLE_JOB_QUEUE` | No | off | Set to `1` together with `DATABASE_URL` to enable the Graphile job queue. |
| `GARAGE_ENDPOINT` | For storage | none | S3-compatible Garage endpoint URL. |
| `GARAGE_BUCKET` | For storage | none | Bucket name; storage stays off unless endpoint, bucket, and both keys are set. |
| `GARAGE_ACCESS_KEY` | For storage | none | Garage access key id. |
| `GARAGE_SECRET_KEY` | For storage | none | Garage secret access key. |
| `GARAGE_REGION` | Recommended | code fallback `us-east-1` | Set to `frithward` to match `region` in `infrastructure/storage/garage.toml`. |
| `INFERENCE_WORKER_URL` | No | `http://localhost:3003` | Orchestrator's upstream inference-worker URL. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | unset (tracing disabled) | OTLP endpoint for API traces and the monitoring collector. |
| `FRITHWARD_DOMAIN` | No | `localhost` | Caddy site hostname for automatic HTTPS. |
| `FRITHWARD_API` | No | `127.0.0.1:3000` | API upstream for Caddy's `/api/*` reverse proxy. |
| `FW_WEB_ROOT` | No | `./apps/web/dist` | Static web root served by Caddy. |

Always set `NODE_ENV=production` for a deployed API: without it, `BETTER_AUTH_SECRET` is generated per process, so sessions are lost on every restart. Set `GARAGE_REGION=frithward` so S3 request signing matches the `region = "frithward"` value in `infrastructure/storage/garage.toml`; the code's `us-east-1` fallback does not match the shipped Garage config.

Create the schema (applies `infrastructure/database/0001_init.sql` and `infrastructure/database/0002_cases_and_reports.sql` to `DATABASE_URL`; the latter adds `cases`, `community_reports`, and `incident_reports`):

```sh
pnpm run db:migrate
```

`pnpm run db:migrate` applies both migration files in order. The `/api/cases` CRUD endpoints are opt-in: they require `DATABASE_URL` and a valid session, and return 503 (`EXTERNAL_UNAVAILABLE`) when no database is configured. Community and incident services use in-memory repositories until `DATABASE_URL` is set.

Start Garage with `infrastructure/storage/garage.toml` (edit the metadata/data paths for your host first), then create the bucket:

```sh
garage server --config infrastructure/storage/garage.toml
garage bucket create frithward
garage bucket info frithward
```

## 3. Run the services

Each service is a separate process. Start them in this order, each in its own terminal or under your process manager:

```sh
pnpm run start:api              # API on 127.0.0.1:3000
pnpm run start:orchestrator     # 3001
pnpm run start:media-worker     # 3002
pnpm run start:inference-worker # 3003
pnpm run start:community        # 3004
pnpm run start:incident         # 3005
pnpm run start:web              # static web preview on 4173
pnpm run start:worker           # Graphile job worker, needs DATABASE_URL
```

`pnpm run start:worker` starts the Graphile job worker (the `analyze-message` handler); it is separate from the media/inference worker processes and needs `DATABASE_URL`. All these scripts run TypeScript source directly through the workspace-local `tsx` runner — there is no compiled server bundle to deploy.

### Docs site, desktop, and extension

The documentation site is built with VitePress. Build it, then serve the built output on `0.0.0.0:4176`:

```sh
pnpm --filter frithward-docs run build
pnpm run start:docs
```

`start:docs` runs `vitepress preview` from `apps/docs` (that package has no `preview` script of its own) and serves `apps/docs/.vitepress/dist` at `http://localhost:4176`.

`pnpm --filter @frithward/desktop run build` produces the desktop frontend only. Building the native Tauri bundle additionally needs `@tauri-apps/cli`, which is host tooling installed outside the project's pnpm build/test toolchain.

The browser extension is built with `pnpm --filter @frithward/extension run build`. Load `apps/extension/dist/chrome-mv3` as an unpacked extension in Chrome, or `apps/extension/dist/firefox-mv2` in Firefox. Its web-app URL defaults to `http://localhost:4173` in `apps/extension/config.ts` and can be overridden at build time with `VITE_FRITHWARD_WEB_URL`; set it and rebuild for a real deployment so the "Open in Frithward" deep link (`/check#text=`) points at your web app. Analysis and recent-check history stay in the browser.

## 4. Put Caddy in front

`infrastructure/deployment/Caddyfile` is a real site block: automatic HTTPS (Caddy default), COOP/COEP headers, `reverse_proxy /api/*`, and a static file root. Local defaults are `localhost`, `127.0.0.1:3000`, and `./apps/web/dist`.

For a public hostname, point DNS at the host, open ports 80/443, and set:

```sh
export FRITHWARD_DOMAIN='frithward.example.com'
export FRITHWARD_API='127.0.0.1:3000'
export FW_WEB_ROOT='/opt/frithward/apps/web/dist'
caddy run --config infrastructure/deployment/Caddyfile
```

Keep the COOP/COEP headers: browser-local analysis relies on a cross-origin-isolated page.

## 5. Backups and restore

pgBackRest config is in `infrastructure/deployment/pgbackrest/pgbackrest.conf` (14 full / 7 differential retention, zstd compression):

```sh
pgbackrest --stanza=main --type=full backup
pgbackrest --stanza=main --type=diff backup
pgbackrest --stanza=main verify
```

Restore to a stopped PostgreSQL instance (this replaces the data directory — take a final backup first):

```sh
pgbackrest --stanza=main --delta restore
psql "$DATABASE_URL" -c 'select count(*) from "user";'
```

Deleting live data does not rewrite existing backups; residual copies age out with the retention window.

## 6. Monitoring

`infrastructure/monitoring/prometheus.yml` scrapes the API (3000), orchestrator (3001), media-worker (3002), inference-worker (3003), community (3004), and incident (3005). `otel.yaml` receives OTLP and forwards to `${env:OTEL_EXPORTER_OTLP_ENDPOINT}` (set it before starting). `loki.yml` tails `/var/log/frithward/*.log`. `grafana/dashboard.yml` provisions Prometheus/Loki datasources and the Frithward dashboard JSON (HTTP request duration and analyses total panels).

```sh
prometheus --config.file=infrastructure/monitoring/prometheus.yml
otelcol --config=infrastructure/monitoring/otel.yaml
loki --config.file=infrastructure/monitoring/loki.yml
```

None of these require a container runtime.

## 7. Verification

```sh
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
node scripts/check-model-cards.mjs
```

Model cards are enforced in CI; the check fails until `models/manifest.json` and each `models/<id>/model-card.md` land. See [compatibility](/compatibility) for supported browsers, operating systems, models, and hardware.
