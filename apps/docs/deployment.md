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

Serve `apps/web/dist` with any static host: `npx serve apps/web/dist` (a one-off command, not a global install), Caddy's `file_server`, or GitHub Pages. On Windows the folder is `apps\web\dist`. The same commands work in PowerShell, macOS, and Linux. Docker is intentionally not used anywhere in this repository.

The optional Hono services (API, orchestrator, media/inference workers, community, incident) are for organizations that want shared or server-side processing. They are **not** part of this path: `apps/web/src` contains no `fetch()` calls, so caption editing and export, document generation, diagrams, charts, media tooling, analysis, and provenance inspection all run in the browser. Caption generation still needs a user-supplied Whisper WASM runtime plus a model (a local `whisper-tiny.bin` or a URL), and non-English OCR needs extra language data placed in `apps/web/public/tessdata`; see [compatibility.md](/compatibility) for the exact list and browser API minimums.

`e2e/browser-only.spec.ts` exercises this static build with `vite preview` and proves there are no `/api/` calls, no external requests, and browser-local persistence. Offline reloads depend on service-worker/browser caching and are not asserted by that suite.

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

No global package installs are required for the application itself; pnpm manages JavaScript dependencies and `uv` manages Python ones.

## 2. Install and configure

```sh
# From the repository root
pnpm install --frozen-lockfile
pnpm run build
```

Set the environment. On Windows PowerShell use `$env:VAR = "..."`; on Linux/macOS use `export VAR=...`. Do not commit these values.

```sh
export DATABASE_URL='postgresql://frithward:<password>@127.0.0.1:5432/frithward'
export BETTER_AUTH_SECRET='<a long random secret from: openssl rand -hex 32>'
```

Create the schema:

```sh
# The db:migrate script is owned by the migration workstream. When present it
# applies infrastructure/database/0001_init.sql and later migrations to
# DATABASE_URL. Until then, apply 0001_init.sql manually.
pnpm run db:migrate
# fallback: psql "$DATABASE_URL" -f infrastructure/database/0001_init.sql
```

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
pnpm run start:web              # static web preview
```

If your checkout exposes the aggregate `pnpm run start:worker` script, it starts the combined worker in place of the individual media/inference worker commands. This tree currently ships the per-worker scripts above; prefer those unless the aggregate script is present.

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
