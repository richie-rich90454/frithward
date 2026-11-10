# Engineering standards

Object-oriented composition, strict layer separation at the module boundary, explicit contracts, and algorithmically efficient implementations. Formatting is oxfmt; linting is oxlint; there is no ESLint or Prettier.

## OOP rules

1. **Construct explicitly.** Classes receive collaborators through constructors. No service locators, no ambient global state.
2. **Encapsulate invariants.** Validate in the constructor or in a policy. Expose `readonly` fields and small public methods.
3. **Compose, do not inherit.** Prefer policy objects, ports, and adapters over deep class hierarchies.
4. **Keep domain headless.** Domain and application code must not reference the DOM, `fetch`, Node built-ins, or a framework.
5. **Separate rendering from logic.** TSX is rendering-only. Controllers hold state and call use cases.
6. **One responsibility per class.** If a class needs "and" in its description, split it.
7. **Model errors as data.** Throw `AppError` with a stable `ErrorCode`; never return a boolean that hides why an operation failed.

## Patterns

| Layer | Pattern | Example | Purpose |
| --- | --- | --- | --- |
| Domain | Entity | `SubtitleSegment` | Enforces timing and text invariants. |
| Domain | Value object | `RedactionRegion` | Normalized coordinates with range checks. |
| Domain | Policy | `CaptionPolicy`, `PiiRedactionPolicy`, `ScamPolicy` | Reusable business rules. |
| Domain | State machine | `ProcessingJob` | Legal transition table and history. |
| Application | Use case | `AnalyzeMessageUseCase`, `AnalyzeImageUseCase` | One operation, one entry point. |
| Port | Interface | `SpeechRecognitionPort`, `AnalysisEnginePort` | Invert external dependencies. |
| Infrastructure | Adapter | `IndexedDbPrivacyRepository`, `ExperimentalDetectorAdapter` | Implement a port. |
| Presentation | Controller | `CaptionStudioController`, `MediaCheckController` | Coordinate use cases and state. |
| Presentation | Presenter | `CaptionStudioPresenter` | Map domain output to a view model. |
| Presentation | View model | `CaptionStudioViewModel` | Rendering-ready, framework-free data. |
| Composition | Root | `createScamModule`, `createAuthModule` | Wire adapters to use cases. |

## Lifecycle and state machines

### Job lifecycle

`ProcessingJob` is the single source of truth for job state:

```text
created -> validated -> initialized -> running -> completed
                                        |          |
                                        |          +-> cancelling -> cancelled
                                        |                       |
                                        +-> failed <------------+
```

`completed`, `cancelled`, and `failed` are terminal. `history` records every applied transition. Workers must not invent states or skip validation.

### Model lifecycle

| Stage | Gate | Allowed use |
| --- | --- | --- |
| `experimental` | Model card with license and limitations. | Research and internal evaluation only. |
| `candidate` | Reproducible benchmark results and known-bias notes. | Opt-in preview with human review. |
| `stable` | Cross-dataset evaluation, calibration, and support commitment. | Product surfaces with limitations displayed. |
| `deprecated` | Migration path and removal date. | No new integrations; existing users warned. |

Model execution follows load → warm up → infer → release. Model loading is separate from inference, one model is active per worker at a time, and disposal releases native resources. Experimental detectors must not be presented as stable.

### UI controller lifecycle

Controllers expose `subscribe`, getters, and actions. Pages subscribe during setup, unsubscribe on cleanup, and re-render from immutable view models. Controllers never write directly to the DOM.

## Error handling

- Validate at trust boundaries: HTTP bodies, tool input, engine output.
- Use `AppError` with one of `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `CANCELLED`, `PROCESSING_FAILED`, `EXTERNAL_UNAVAILABLE`, `UNAUTHORIZED`.
- Preserve the cause. `AppError` stores `causeMessage` when the cause is an `Error`.
- Controllers catch, record a user-safe message, and rethrow. They do not swallow failures.
- Map trust-boundary failures to HTTP status codes: validation to 400, unauthorized to 401, not found to 404, conflict to 409, and unavailable to 503.
- `AbortSignal` cancellation maps to `CANCELLED`, not to a generic failure.
- No `console.log` in TSX. No empty `catch`. No `any`.

## Code organization

```text
packages/<package>/src/
  domain/            entities, value objects, policies
  application/       use cases and job handlers
  ports/             interfaces
  infrastructure/    adapters
  presentation/      controllers, presenters, view models
  *.test.ts          colocated tests
  index.ts           barrel export
```

File names are PascalCase for classes and camelCase for tests. Features in `apps/web/src/features/<feature>/presentation/` follow the same split. Tests are runnable with `pnpm test`; end-to-end tests use Playwright.

## Algorithm complexity doctrine

### Budget

| Operation | Required | Acceptable | Unacceptable |
| --- | --- | --- | --- |
| Scam text pattern scan | O(n·p), p fixed | Single pass over the text | Nested scan per character |
| URL inspection | O(n + b·m) | n = URL length, b = fixed brand list, m = label length | Quadratic string comparison over the whole URL |
| Caption segment insertion | O(log n) or O(n) with a documented bound | Linear overlap scan for bounded projects | Unbounded O(n²) without a bound |
| Caption listing | O(n log n) | Cached sorted view | Sorting on every read |
| Metadata inspection | O(f) | Single pass with `Map`/`Set` | Nested loops over fields and values |
| Model inventory size | O(1) cached | Recomputed only on mutation | Iterating all models per render |
| Job transition | O(1) | — | — |
| Engine inference | Model-specific | Streaming O(n) with bounded memory | Loading an entire asset when a chunked path exists |

### Anti-quadratic examples

1. **Overlap checks in a growing list.** `CaptionProject.addSegment` asks `CaptionPolicy.assertNoOverlap` to scan every existing segment. Inserting n segments is therefore O(n²). Keep the segment list sorted and compare only neighbors, or maintain an interval index, and document the maximum segment count the operation supports.
2. **Sorting on read.** `CaptionProject.listSegments` sorts a copy on every call. A render loop that calls it per frame turns O(n log n) into repeated work. Sort on mutation or cache the sorted view.
3. **Recomputing aggregates.** `ModelManager.totalSizeBytes` walks all models. Cache the total and update it in `markInstalled`/`uninstall`.
4. **Fixed pattern sets are fine.** `AnalyzeMessageUseCase` tests four regexes per request: O(n·p) with p constant, effectively O(n). Do not nest a scan over input for each pattern.
5. **Bounded edit distance.** `UrlInspectionUseCase` compares the registrable label against a fixed brand list. The brand list is constant, so the cost stays linear in the number of brands, not quadratic in URL length.
6. **Single-pass field inspection.** `MetadataInspectionUseCase` builds a `Map` and a `Set`, then makes one pass over keys and one over values. Keep that shape; do not add a nested lookup per field.

### Performance measurement

- Measure before optimizing. Record input size, device, warm-up, and median of repeated runs.
- Use the `research/benchmarks` harness and attach results to a model card.
- Report throughput and latency with their units and test conditions.
- Never publish a number that was not measured. Missing data is written as "not measured", not as an estimate.
- Prefer bounded memory for media. Large files are streamed in chunks and cancelled at chunk boundaries.

## Tooling

| Command                     | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `pnpm run format`           | Apply oxfmt.                                           |
| `pnpm run format:check`     | Verify formatting.                                     |
| `pnpm run lint`             | Run oxlint.                                            |
| `pnpm run check:boundaries` | Run `scripts/check-boundaries.mjs`.                    |
| `pnpm run typecheck`        | Run `tsc -b`.                                          |
| `pnpm test`                 | Run Vitest unit tests.                                 |
| `pnpm test:e2e`             | Run Playwright end-to-end tests.                       |
| `pnpm run check`            | Format check, lint, boundaries, typecheck, unit tests. |

Dependencies resolve with `@latest` and are pinned by the committed lockfile. Do not float production versions in manifests.
