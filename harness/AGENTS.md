# Project Instructions

This package is the portable agent loop, not a product app.

- Canonical Layer 0 for the sandbox is the repo-root `AGENTS.md`.
- ICM factory lives in `../.icm/`. Only open it when the user is running the factory, not for tool-loop prompts.
- Paths here are under `lib/`, not `src/`.
- Do not treat this file as product conventions. Do not invent `packages/`, bun scripts, or `I_` / `T_` / `E_` naming from this file.
- When this directory is `project-cwd`, verify with `pnpm typecheck` and `pnpm lint` only if those scripts exist.

# Claude multi-role mode

Strict role split (default):

- **Orchestrator (Sonnet)**: plan and delegate via `task`. Tools: read, grep, survey, task, todo, askUser, loadSkill.
- **Explorer (Haiku)**: read-only research via `task(subagentType=explorer)`. Tools: read, grep.
- **Executor (Sonnet)**: implement from a structured `plan` passed to `task(subagentType=executor)`. Tools: read, grep, write, bash.
- **Reviewer (Opus)**: read-only post-check after executor runs verification and produces a diff summary.

Plan approval: with `HARNESS_PLAN_APPROVAL=interactive` (default), every `task(executor)` shows the plan, allowed write paths, and verification commands, then waits for `y/N` in the terminal. `N` asks for a reason and returns it to the orchestrator; the executor does not run. Explorer is never gated. Use `background` for CI.

Configure in `harness/.env`. All four role models are **required**; harness fails fast if any is missing:

```env
ORCHESTRATOR_MODEL=anthropic/claude-sonnet-4-6
EXPLORER_MODEL=anthropic/claude-haiku-4-5
EXECUTOR_MODEL=anthropic/claude-sonnet-4-6
REVIEWER_MODEL=anthropic/claude-opus-4-6
HARNESS_CWD=/absolute/path/to/target-repo
```

To switch models, edit `.env` and restart the harness process. There are no hardcoded model defaults in code.

Run harness from this directory:

```bash
pnpm install
pnpm start -- "Implement the next step from plan.md"
```

Or pass cwd explicitly:

```bash
pnpm start -- /path/to/ssl "Analyze auth module and delegate implementation"
```

Audit logs: `<target-repo>/.harness/runs/<runId>.json`

# Course tool lessons

When asked which Vercel Academy lesson introduced a `tool()` call, use this map. Do not search `.icm/` or the web for lesson numbers.

- `read` — 1.1–1.2 From Chat to Agent / Your First Tools
- `grep` — 1.2 Your First Tools
- `bash` — 1.3 Completing the Toolbox / 2.2 Shell Execution
- `write` — 1–2 Completing the Toolbox
- `task` — 6.2 Explorer / 6.3 Executor
- `survey` — 9.2 Fast Context Understanding (when grep isn't enough)
- `loadSkill` — 11.1 Skills System

