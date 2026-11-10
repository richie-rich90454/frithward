# Security architecture

Security is defense in depth with a minimal network surface. The project prioritizes private reporting, dependency integrity, and explicit hosted execution.

## Controls

| Control | Implementation |
| --- | --- |
| Dependency pinning | `pnpm-lock.yaml` is committed. Manifests resolve `@latest`; the lockfile is the reproducible pin. |
| Dependency review | `oxlint` enables `import/no-cycle`, `import/no-relative-packages`, and unsafe-TypeScript rules. |
| Supply chain scanning | `infrastructure/security/trivy.yaml` and SBOM generation are part of the deployment toolkit. |
| Secret handling | No secrets in source. `BETTER_AUTH_SECRET` and `DATABASE_URL` come from the environment. |
| Input validation | Zod schemas in `@frithward/contracts`; `AppError` at trust boundaries. |
| Output safety | Detection summaries state that results are evidence, not proof; no percentages without measurement. |
| Network surface | One HTTP port per service, TLS terminated at Caddy. |
| Isolation | Browser code cannot import `services/api`; enforced by `scripts/check-boundaries.mjs`. |
| Media storage | S3-compatible Garage with validated bucket and object keys. |
| Monitoring | Prometheus, Loki, Grafana, and OpenTelemetry configurations under `infrastructure/monitoring/`. |

## Application security

- **Framework:** Hono with `@hono/node-server`. Routes are small and delegate to use cases.
- **Validation:** request bodies are checked at the route edge. Domain policies enforce length and format limits.
- **Errors:** `AppError` carries a stable code and optional cause. Controllers record a user-safe message and rethrow. No stack traces are returned to clients.
- **Static analysis:** `oxlint` forbids `any`, unsafe assignment/member access/call/return/argument, non-null assertions, floating promises, `eval`, and empty blocks. TypeScript runs in strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- **Rendering:** TSX is rendering-only. `alert()` and `console.log()` in TSX fail the boundary check.

## Authentication

`services/api` uses `better-auth` with the Drizzle Postgres adapter. The schema defines `user`, `session`, and `scam_analyses` tables. Today only `GET /api/auth/session` is mounted, and it reports whether a database is configured. The better-auth handlers are not yet exposed.

`BETTER_AUTH_SECRET` must be set in deployed environments. The code falls back to `frithward-local-dev-secret`, which is only acceptable for local development. Sessions are stored server-side in Postgres.

## Storage

`GarageObjectStorage.objectUrl(bucket, key)` validates that the bucket and key are non-empty and builds `{endpoint}/{bucket}/{key}`. Object keys are not escaped; callers must supply safe keys. Media is served from the configured Garage endpoint, not from the API process.

## Network surface

| Service            | Port | Exposure                                                       |
| ------------------ | ---- | -------------------------------------------------------------- |
| `api`              | 3000 | Public with TLS in deployment; no auth on mounted routes today |
| `orchestrator`     | 3001 | Internal                                                       |
| `media-worker`     | 3002 | Internal                                                       |
| `inference-worker` | 3003 | Internal                                                       |
| `community`        | 3004 | Internal                                                       |
| `incident`         | 3005 | Internal                                                       |
| Garage             | 3900 | Internal object storage                                        |
| Postgres           | 5432 | Internal                                                       |

Caddy terminates TLS. Worker ports expose `/health` only. Deployments must not publish worker ports or Postgres to the public internet.

## Known gaps

- No rate limiting or bot management is implemented yet.
- No authentication guards on the mounted API routes.
- The hosted analysis adapter is not wired and returns `EXTERNAL_UNAVAILABLE`.
- No automated secret scanning is configured in the repository today; use an external scanner in CI.
- No SBOM is committed to the repository; generate one during release.

## Vulnerability reporting

Report vulnerabilities privately to the maintainers. Do not open a public issue. Include affected versions, reproduction steps, impact, and any proof of concept. The maintainers acknowledge receipt, investigate, fix, and publish a coordinated disclosure. Do not attempt to access, modify, or exfiltrate other users' data.

See [SECURITY.md](../../SECURITY.md) and [THREAT_MODEL.md](../../THREAT_MODEL.md).
