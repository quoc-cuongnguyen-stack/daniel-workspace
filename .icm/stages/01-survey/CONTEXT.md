# 01 — Survey

One job: observe the target. Do not design ICM, map layers, or scaffold `.icm/projects/<slug>/`.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Layer 0 | `AGENTS.md` (repo root) | Full | Factory identity |
| Layer 1 | `.icm/CONTEXT.md` | Task Routing | Confirm this stage |
| Layer 3 | `.icm/_config/discovery-rules.md` | Survey checklist | What to look for |
| Layer 4 | `.icm/projects/<slug>/input/run.md` | Full | `project-cwd`, slug, intent |
| Target | `<cwd>/AGENTS.md` | Architecture + Style | Layer 0 candidate |
| Target | `<cwd>/package.json` | `name`, `scripts`, `dependencies` | Stack |
| Target | `<cwd>/README.md` | First heading + Layout | Stated purpose |
| Target | `<cwd>` top-level dirs | Names only | Layout evidence |

## Process

1. Read `run.md`. Abort if `project-cwd` is missing or not a directory.
2. Record stack, scripts, AGENTS.md presence, top-level dirs, naming evidence.
3. List candidate workflows with one-line evidence each.
4. Mark gaps as `ASSUMPTION:`. Do not invent conventions.
5. Run the audit. Write the output. Stop.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Survey | `output/<slug>-survey.md` | YAML header (`slug`, `project_cwd`, `surveyed_at`) + Stack, Layout, ConventionsObserved, CandidateWorkflows, Assumptions |

## Checkpoint

Stop. Human edits conventions and workflow candidates before `02-map-layers`.

## Audit

- [ ] `project-cwd` is absolute and exists
- [ ] No `src/modules` or `I_` / `T_` / `E_` unless a path was seen
- [ ] Every convention cites a file path
- [ ] Output is under 200 lines
