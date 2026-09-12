# Project Instructions

This is `daniel-workspace`, a personal agent sandbox. It is not the SSL product. SSL stays untouched.

## Where am I

- `harness/` — portable agent loop (AI SDK + Claude). Point it at any repo with `pnpm start -- <project-cwd> "<prompt>"`. Code lives under `harness/lib/`, not `src/`.
- `.icm/` — Interpretable Context Methodology factory. Layer 1 is `.icm/CONTEXT.md`.
- Target product repos are `project-cwd` only. Generated ICM instances live in `.icm/projects/<slug>/`.

## Layer 0 rules

- This file is Layer 0. Never create, reference, or use `CLAUDE.md`.
- Run one factory stage at a time. Load only the sections named in that stage's Inputs table.
- Write every handoff as markdown in `output/`. The next stage reads whatever a human left on disk.
- Do not write files into `project-cwd`. Do not modify `harness/lib/` unless the user asked for a harness change.
- Do not hardcode `src/modules`, `src/shared`, or `I_` / `T_` / `E_` naming. Discover them from the target, or record `ASSUMPTION:`.

## How to run the factory

1. Copy `.icm/shared/templates/run-input.md` to `.icm/projects/<slug>/input/run.md` and fill `project-cwd`, `slug`, and intent.
2. Read `.icm/CONTEXT.md` and execute stages `01-survey` through `05-validate` in order.
3. Stop at each checkpoint. Do not start the next stage until the human has reviewed the output file.
