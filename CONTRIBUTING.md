# Contributing to Frithward

## Workflow

1. Implement the complete feature including callers, exports, and tests.
2. Keep domain logic framework-independent.
3. Keep TSX rendering-only. Put logic in headless classes.
4. Add a runnable test for new non-trivial logic.
5. Run format, lint, boundary check, typecheck, and tests before opening a pull request.

## Commits

Use conventional commits in American English, one file per commit.

Examples: `feat: add caption export service`, `fix: handle cancelled transcription`, `docs: clarify model policy`, `refactor: extract caption policy`.

## Dependencies

Resolve with `pnpm add <package>@latest`. Commit the lockfile. Do not float production versions.
