# 04 — Scaffold

One job: write `.icm/projects/<slug>/`. Do not run the product pipeline.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Layer 3 | `.icm/shared/templates/project-context.md` | Full | Layer 1 skeleton |
| Layer 3 | `.icm/shared/templates/stage-context.md` | Full | Stage skeleton |
| Layer 3 | `.icm/shared/templates/feature-pipeline-stages.md` | Chosen template section | Product stages |
| Layer 3 | `.icm/_config/token-budget.md` | Caps | Line limits |
| Layer 4 | `../02-map-layers/output/<slug>-layer-map.md` | Full | Bindings |
| Layer 4 | `../03-select-workflow/output/<slug>-pipeline.md` | Full | Stage list |

## Process

1. Create `.icm/projects/<slug>/` from templates. Fill Layer 3 from the survey (observed naming only).
2. Write each product stage `CONTEXT.md` with Inputs tables that name sections.
3. Leave product `output/` as `.gitkeep` only.
4. Do not write into `project-cwd`. Do not create `CLAUDE.md`.
5. Run the audit. Write the scaffold log. Stop.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Product tree | `.icm/projects/<slug>/` | `CONTEXT.md`, `_config/`, `stages/`, `input/` |
| Receipt | `output/<slug>-scaffold-log.md` | Every path written |

## Checkpoint

Stop. Human edits generated `CONTEXT.md` files before any product stage run.

## Audit

- [ ] No file created under `project-cwd`
- [ ] No `CLAUDE.md`
- [ ] Every `CONTEXT.md` ≤ 80 lines
- [ ] References ≤ 200 lines
- [ ] Product `output/` empty except `.gitkeep`
