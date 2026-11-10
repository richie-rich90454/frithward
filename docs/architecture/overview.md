# Frithward architecture

Frithward is a browser-first, local-first, object-oriented modular monolith.
TypeScript and SolidJS provide the application surface, Hono services provide
explicit hosted execution, Python engines provide model-backed media analysis,
and Rust crates provide the command-line and media/provenance primitives.

Local execution is the default. Hosted execution is explicit, opt-in, and never
implicit in the browser path.

## Repository layout

| Path | Contents |
| --- | --- |
| `apps/web` | SolidJS browser application and design-system consumer. |
| `apps/desktop` | Tauri desktop shell with client-side routing. |
| `apps/extension` | WXT browser-extension entry points. |
| `apps/public-proof` | Static provenance verification page. |
| `apps/docs` | VitePress documentation site. |
| `packages` | Shared domain, application, port, infrastructure, and presentation code. |
| `services` | Hono HTTP services: API, orchestrator, media/inference workers, incident, community. |
| `tools` | User-facing tool facades over shared packages. |
| `engines` | Python media engines (audio, document, image, text, video, provenance). |
| `crates` | Rust crates: CLI, media, privacy, provenance, runtime. |
| `research` | Model/dataset notes and the benchmark harness. |
| `infrastructure` | Database schema, deployment, monitoring, security, and storage configuration. |
| `docs` | Architecture, engineering, API, engine, privacy, security, research, community, and governance documentation. |

## Layered architecture

The dependency direction is inward. Each package separates presentation,
application, domain, ports, and infrastructure.

```text
presentation  ->  application  ->  domain  <-  infrastructure
                       |                         ^
                       +---------- ports -------+
```

| Layer | Responsibility | May import |
| --- | --- | --- |
| `presentation` | Controllers, presenters, view models, TSX rendering | application, domain, view models |
| `application` | Use cases, job handlers, orchestration | domain, ports |
| `domain` | Entities, value objects, policies, invariants | nothing outside the package |
| `ports` | Interfaces for external capabilities | domain types |
| `infrastructure` | Adapters: IndexedDB, HTTP, hosted engines, storage | ports, domain |

Concrete adapters are wired in composition roots such as
`services/api/src/modules/*/composition/*` and application entry points. Domain
logic never imports a framework, DOM API, Node API, or network client.

### Enforcement

Boundaries are enforced by tooling, not convention:

- `scripts/check-boundaries.mjs` classifies every `.ts`/`.tsx` file by path and
  fails the build when a layer imports a forbidden layer. It also rejects
  `alert()` and `console.log()` in TSX.
- `oxlintrc.json` adds `import/no-restricted-paths` zones for domain,
  application, and presentation, plus `import/no-cycle` and
  `import/no-relative-packages`.
- `tsc -b` enforces strict mode, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`, and `verbatimModuleSyntax`.

## Module boundaries

| Package | Responsibility |
| --- | --- |
| `@frithward/contracts` | Zod schemas, `ErrorCode`, `AppError`, media and scam DTOs. The only runtime dependency is `zod`. |
| `@frithward/configuration` | `AppConfiguration` for base URL and execution location. |
| `@frithward/runtime` | `ExecutionRouter` and the `ProcessingJob` state machine. |
| `@frithward/execution-router` | Compatibility re-export of `@frithward/runtime`. |
| `@frithward/media-core` | Caption projects, subtitle segments, caption policy, export, and studio controller. |
| `@frithward/media-analysis` | Audio/image/video/multimodal analysis and face/voice protection use cases, ports, adapters, and media-check controller. |
| `@frithward/media-metadata` | Metadata key inspection for GPS/location leakage. |
| `@frithward/privacy-core` | Metadata inspection, PII redaction policy, redaction regions, sanitized export, IndexedDB repository, share-check controller. |
| `@frithward/provenance-core` | `ProvenanceRecord` and `VerifyProvenanceUseCase`. |
| `@frithward/security-core` | Scam message, URL, and QR inspection; scam reporting; guided older-adult flow. |
| `@frithward/model-registry` | Model cards with stage, license, intended use, and limitations. |
| `@frithward/model-manager` | Installed model inventory and size accounting. |
| `@frithward/sdk` | `FrithwardClient` base-URL endpoint builder. |
| `@frithward/storage` | In-memory key/value storage. |
| `@frithward/ui` | Shared surface role names. |
| `@frithward/worker-client` | Worker run/stop lifecycle guard. |
| `@frithward/design-system` | CSS tokens, components, layouts, accessibility, and icons. |

Rules that hold across packages:

1. Domain and application code is framework-independent and headless.
2. TSX is rendering-only. Logic lives in controller classes that expose
   subscribe/getter methods.
3. Packages import each other through workspace package names, never relative
   paths.
4. Every package exports a barrel `index.ts`; consumers import the package.
5. Tests are colocated as `*.test.ts` and run with Vitest.

## Runtime and execution model

### Execution locations

`ExecutionRouter` chooses where a capability runs. The default is `browser`;
`native` and `hosted` are explicit overrides. `AppConfiguration` carries the
base URL and default location. Hosted adapters must be opted into, and the
hosted analysis bridge currently reports `EXTERNAL_UNAVAILABLE` until the
runtime client is wired.

### Job state machine

`ProcessingJob` exposes a strict transition table. Illegal transitions throw.

| Current state | Allowed next states |
| --- | --- |
| `created` | `validated` |
| `validated` | `initialized` |
| `initialized` | `running` |
| `running` | `completed`, `cancelling`, `failed` |
| `cancelling` | `cancelled`, `failed` |
| `completed` | none |
| `cancelled` | none |
| `failed` | none |

Every transition is appended to a read-only history. `WorkerClient` guards
against concurrent runs. The API runs `graphile-worker` against Postgres for
queued work; `AnalyzeJobHandler` validates the job id and text payload.

### Cancellation

Long-running operations accept an `AbortSignal`. Use cases check the signal
before starting and at chunk or utterance boundaries, then throw
`AppError("CANCELLED", ...)`. Callers must propagate cancellation rather than
swallow it.

### Persistence

- Browser: `IndexedDbPrivacyRepository` stores privacy inspection records in an
  origin-private database.
- API: Drizzle manages `user`, `session`, and `scam_analyses` tables.
- Media: `GarageObjectStorage` builds validated object URLs for an
  S3-compatible Garage endpoint.

## Backend layers

The API service is a Hono application composed from modules:

```text
HTTP request
  -> module route (presentation)
  -> use case (application)
  -> policy / entity (domain)
  -> port (interface)
  -> adapter (infrastructure)
  -> JSON response
```

| Service | Default port | Role |
| --- | --- | --- |
| `services/api` | 3000 | Scam analysis, auth session probe, health. |
| `services/orchestrator` | 3001 | Health and future job orchestration. |
| `services/media-worker` | 3002 | Media job worker health. |
| `services/inference-worker` | 3003 | Inference job worker health. |
| `services/community` | 3004 | Community service health. |
| `services/incident` | 3005 | Incident service health. |

Auth uses `better-auth` with the Drizzle Postgres adapter. Only a session
configuration probe is mounted today; the better-auth route handlers are not
yet exposed. `BETTER_AUTH_SECRET` must be set in deployed environments because
the code falls back to a local-development secret.

## Frontend architecture

`apps/web` uses SolidJS, Vite, `@solidjs/router`, `@tanstack/solid-query`,
Kobalte, and lucide icons. Features are organized as:

```text
src/features/<feature>/presentation/
  controllers/   headless state and use-case coordination
  pages/         view models in, TSX out
```

`styles.ts` imports design-system tokens, components, layouts, and accessibility
styles. `app.css` provides the shell. Controllers wrap package use cases and
notify subscribers; pages subscribe and render. No network call is made by the
scam-check or share-check controllers, so those flows stay local.

## Data-flow examples

1. **Hosted scam check.** `POST /api/scam/message` → `ScamAnalysisRoutes` →
   `AnalyzeMessageUseCase` → `ScamPolicy` and the pattern table →
   `ScamAnalysis` → JSON.
2. **Browser scam check.** `ScamCheckView` → `ScamCheckController` →
   `AnalyzeMessageUseCase`. The same domain logic runs without a network call.
3. **Share check.** `ShareCheckController` (web) → `InspectPrivacyUseCase` →
   `PrivacyPolicy`. The richer `MetadataInspectionUseCase` and
   `SanitizedExportUseCase` remain available for tooling.
4. **Media analysis.** `MediaCheckController` → `Analyze{Audio,Image,Video,Multimodal}UseCase`
   → `AnalysisEnginePort` → `ExperimentalDetectorAdapter` or
   `HostedAnalysisAdapter` → `DetectionReport` → `MediaCheckPresenter` →
   `MediaCheckViewModel`.
5. **Provenance.** `ProvenanceCheckController` → `VerifyProvenanceUseCase` →
   human-readable signature status.

## Build and verification

`pnpm run check` runs formatting, linting, boundary checks, typechecking, and
unit tests in order. Playwright runs end-to-end tests against the built web
preview. Python engines run pytest with their own virtual environments.
