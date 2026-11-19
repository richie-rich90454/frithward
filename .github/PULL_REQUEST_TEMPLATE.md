## Summary

What changed, and why. Link the issue this addresses, if there is one.

## Scope

Which surfaces are affected (web, desktop, extension, public proof, API or other service, engine, crate, docs). Note anything intentionally left out.

## How this was tested

Describe the commands you ran and what you observed. Include the OS and browser for UI changes.

## Checks

- [ ] `pnpm run check` passes (format check, lint, boundaries, self-tests, typecheck, unit tests)
- [ ] `pnpm run test:e2e` passes when the UI changed
- [ ] Per-engine `uv run pytest` passes when an engine changed
- [ ] `cargo check` and `cargo test` pass when a crate changed
- [ ] New non-trivial logic has a runnable test
- [ ] Module-boundary rules are respected (no domain-to-infrastructure or TSX-to-logic imports)

## Privacy and honesty

- [ ] Privacy behavior is documented, and local execution stays the default
- [ ] Limitations are stated plainly; detection output is evidence, not a verdict
- [ ] No fabricated metrics or screenshots; unmeasured results are written as "not measured"
- [ ] No victims' private information or non-consensual identity material is included

## Commit hygiene

- [ ] One file per commit, with conventional commit messages in American English

## Screenshots

Optional. If you add any, use synthetic or properly consented material only, and say what is real and what is illustrative.
