# Project Instructions

This package is the portable agent loop, not a product app.

- Canonical Layer 0 for the sandbox is the repo-root `AGENTS.md`.
- ICM factory lives in `../.icm/`. Start at `../.icm/CONTEXT.md`.
- Paths here are under `lib/`, not `src/`.
- Do not treat this file as product conventions. Do not invent `packages/`, bun scripts, or `I_` / `T_` / `E_` naming from this file.
- When this directory is `project-cwd`, verify with `pnpm typecheck` and `pnpm lint` only if those scripts exist.
