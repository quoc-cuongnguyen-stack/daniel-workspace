# Project Instructions

This package is the portable agent loop, not a product app.

- Canonical Layer 0 for the sandbox is the repo-root `AGENTS.md`.
- ICM factory lives in `../.icm/`. Only open it when the user is running the factory, not for tool-loop prompts.
- Paths here are under `lib/`, not `src/`.
- Do not treat this file as product conventions. Do not invent `packages/`, bun scripts, or `I_` / `T_` / `E_` naming from this file.
- When this directory is `project-cwd`, verify with `pnpm typecheck` and `pnpm lint` only if those scripts exist.

# Course tool lessons

When asked which Vercel Academy lesson introduced a `tool()` call, use this map. Do not search `.icm/` or the web for lesson numbers.

- `read` — 1.1–1.2 From Chat to Agent / Your First Tools
- `grep` — 1.2 Your First Tools
- `bash` — 1.3 Completing the Toolbox / 2.2 Shell Execution
- `write` — 1–2 Completing the Toolbox
- `task` — 6.2 Explorer / 6.3 Executor

