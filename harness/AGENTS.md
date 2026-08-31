# Agent harness (WIP)

Portable rules for coding agents. Not installed on any product repo yet.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Core working rules

- **Code discovery:** Prefer graph tools (`codebase-memory-mcp`) before text search.
- **Secret protection:** Never output or commit secrets.
- **Ponytail:** Pick the simplest solution that works. See `rules/ponytail.mdc`.

## Skills

Generic skills live in `skills/`. Product-specific skills (test-workflow, debug-workflow) stay in the product repo.

## Hooks

Generic hooks in `hooks/`: `prevent-dangerous-git.sh`, `prevent-secret-exposure.sh`. Product repos add their own guards.

## MCP

Copy `mcp.json.example` to the product `.cursor/mcp.json` and fill placeholders. Never commit tokens.
