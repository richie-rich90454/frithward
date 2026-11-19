# Contributing to Frithward

Thanks for helping build a tool that people can rely on when the stakes are personal. This page is the practical guide: how to set up, how to verify a change, where new code belongs, and how we work together.

## Setup

You need Node.js 26 and pnpm 10 or newer. There is no Docker or container runtime requirement. Python engines need Python 3.12+ and [uv](https://docs.astral.sh/uv/); Rust crates need the toolchain in `rust-toolchain.toml`.

```text
pnpm install
pnpm run build                                  # once, before start:web on a clean checkout
pnpm run start:web                              # built web app on port 4173
pnpm run start:api                              # Hono API on port 3000, no build needed
pnpm --filter @frithward/web run dev             # live dev server on port 5173
```

The commands above are the same in PowerShell on Windows and in a shell on macOS and Linux. For deployed or authenticated API work, set `DATABASE_URL` and `BETTER_AUTH_SECRET`; the local health endpoint needs neither.

## Validation

Run these before opening a pull request. `pnpm run check` is the single command that covers the JavaScript and TypeScript side.

```text
pnpm run check                                  # format check, lint, boundaries, 11 self-tests, typecheck, unit tests
pnpm exec playwright install                     # once, before the first E2E run
pnpm run test:e2e                               # Playwright + axe-core accessibility checks
```

For a Python engine, run its own suite from the engine directory. Each engine has a `pyproject.toml` and a committed `uv.lock`:

```text
cd engines/audio/detection
uv run pytest
```

Substitute the engine you changed. For Rust, check and test each crate you touched:

```text
cd crates/frithward-privacy
cargo check
cargo test
```

The Tauri shell lives at `apps/desktop/src-tauri` and is checked the same way.

## Module boundaries

Boundaries are enforced by tooling, not by convention. `scripts/check-boundaries.mjs` classifies every `.ts` and `.tsx` file by path and fails on these imports:

- domain importing infrastructure
- application importing infrastructure or a TSX file
- presentation importing infrastructure
- TSX importing a value from a logic barrel, or containing `alert()` or `console.log()`
- frontend code importing a backend service package

oxlint adds `import/no-restricted-paths` zones, `import/no-cycle`, and `import/no-relative-packages`. Packages import each other by workspace name, never by relative path across packages. To check just this layer:

```text
pnpm run check:boundaries
pnpm run check:boundaries:test
```

## Adding a feature

Start with the problem and the smallest complete change that solves it. New logic belongs in a package, split by layer:

```text
packages/<package>/src/
  domain/            entities, value objects, policies, invariants
  application/       use cases and job handlers
  ports/             interfaces for external capabilities
  infrastructure/    adapters that implement ports
  presentation/       controllers, presenters, view models
  *.test.ts          colocated tests
  index.ts           barrel export
```

1. Put the business rule in `domain` as an entity, value object, or policy. Domain code is headless: no DOM, `fetch`, Node built-ins, or framework references.
2. Put one operation in `application` as a use case with a single entry point. Pass collaborators through the constructor.
3. Define any external capability as an interface in `ports` and implement it as an adapter in `infrastructure`.
4. Wire concrete adapters to use cases in a composition root such as `services/api/src/modules/*/composition/*`.
5. Keep TSX rendering-only. State and use-case calls live in controller classes that expose `subscribe`, getters, and actions; pages subscribe and render immutable view models.
6. Export the package through its `index.ts` and import it by workspace name.
7. Add a runnable test for new non-trivial logic, including a branch, loop, parser, or any money or privacy handling.

Long-running work accepts an `AbortSignal`; check it at chunk, utterance, page, or frame boundaries and propagate cancellation rather than swallowing it. Model-backed work follows the stage gates in `MODEL_POLICY.md`, and detection output is always presented as evidence with limitations, never as a verdict.

## Commits

Use conventional commits in American English, with one file per commit. Keep the message short and imperative.

Examples:

```text
feat: add caption export service
fix: handle cancelled transcription
docs: clarify model policy
refactor: extract caption policy
test: cover boundary checker for dynamic imports
```

Resolve dependencies with `pnpm add <package>@latest` and commit the lockfile. Do not float production versions in manifests, and do not add a dependency for a few lines of code.

## Safety and privacy

- Never publish victims' private information or non-consensual identity datasets.
- Do not build tools whose primary purpose is impersonating a real person.
- Do not invent metrics or screenshots. Write "not measured" where a number has not been measured, and use synthetic or consented material in demonstrations.
- Keep local execution the default. Hosted execution must be explicit and opt-in.
- Consequential decisions require human review.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Report it privately through the repository's GitHub Security Advisories, linked from [SECURITY.md](SECURITY.md), and include affected versions, reproduction steps, and impact. Security fixes take priority over normal discussion but still require tests and a coordinated disclosure.

## Code of conduct

Be patient and assume good faith; older adults and people under scam pressure are among the primary users. Harassment, hate speech, personal attacks, and sharing victims' private information are not acceptable. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Conduct concerns can be raised privately with the maintainers through the repository.
