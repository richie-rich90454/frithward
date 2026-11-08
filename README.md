# Frithward

Keep people safe. Keep media honest.

Open-source digital safety, media intelligence, privacy, and creation ecosystem. Browser-first, local-first, object-oriented modular monolith. Primary software license: Apache-2.0.

Creator: Richard Jiang.

## Status

Phase 0 foundation plus Frithward 0.1 core tools: local caption generation, subtitle editing and export, audio/video/image helpers, document OCR hooks, metadata inspection, share check, scam check, C2PA verification hook, local model registry, and experimental text analysis.

## Quick start

Requires Node.js 26 LTS and pnpm.

```powershell
pnpm install
pnpm run start
pnpm run check
```

Serve separately with plain Node:

```powershell
pnpm run start:web
pnpm run start:api
```

## Repository layout

See the architecture specification: `apps/`, `packages/`, `tools/`, `engines/`, `services/`, `crates/`, `research/`, `infrastructure/`, `docs/`.

## Engineering rules

- Object-oriented composition, strict separation of rendering, application logic, and infrastructure.
- Module boundaries enforced by oxlint and `scripts/check-boundaries.mjs`, not documentation alone.
- Dependencies resolved with `@latest`; the committed lockfile is the reproducible pin.
- Formatting: oxfmt. Linting: oxlint. No ESLint or Prettier.
