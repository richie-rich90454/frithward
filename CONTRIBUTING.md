# Contributing to Frithward

## Workflow

1. Implement the complete feature including callers, exports, and tests.
2. Keep domain logic framework-independent.
3. Keep TSX rendering-only. Put logic in headless classes.
4. Add a runnable test for new non-trivial logic.
5. Run format, lint, boundary check, typecheck, and tests before opening a pull request.

## Enforced boundary commands

The module boundaries are enforced by tooling. Run these before requesting review:

```powershell
pnpm run check:boundaries
pnpm run lint
pnpm run typecheck
pnpm run test
```

`pnpm run check:boundaries` runs `scripts/check-boundaries.mjs`. It fails when domain imports infrastructure or presentation, when application imports infrastructure, when presentation imports infrastructure, when TSX imports a logic layer, or when TSX contains `alert()` or `console.log()`. `pnpm run lint` applies the oxlint `import/no-restricted-paths` zones, `import/no-cycle`, and `import/no-relative-packages`. `pnpm run check` runs the full sequence: format check, lint, boundaries, typecheck, and unit tests.

## Commits

Use conventional commits in American English, one file per commit.

Examples: `feat: add caption export service`, `fix: handle cancelled transcription`, `docs: clarify model policy`, `refactor: extract caption policy`.

## Dependencies

Resolve with `pnpm add <package>@latest`. Commit the lockfile. Do not float production versions.
