# 05 — Validate

One job: audit the generated ICM. Do not refactor it.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Layer 3 | `.icm/_config/conventions.md` | Validation | Pass/fail rules |
| Layer 4 | `../04-scaffold/output/<slug>-scaffold-log.md` | Full | Paths to inspect |
| Product | `.icm/projects/<slug>/CONTEXT.md` | Task Routing + Bindings | Layer 1 |
| Product | `.icm/projects/<slug>/stages/*/CONTEXT.md` | Headers + Inputs tables | Layer 2 |

## Process

1. Walk the checklist below. Cite `file:section` for each row.
2. Do not fix files. Record fail and the edit a human should make.
3. Write the report. Stop.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Validation | `output/<slug>-validation.md` | One row per check: pass/fail + evidence |

## Checkpoint

Failures are human-fixable on disk. Re-run this stage only unless the tree changed.

## Audit

- [ ] Every check has a binary pass condition
- [ ] No "looks good"
- [ ] Glass-box: numbered folders + `output/*.md` show pipeline state
- [ ] Context isolation: Inputs name sections; CONTEXT.md ≤ 80 lines
- [ ] HITL: outputs are markdown a human can edit
- [ ] `AGENTS.md` only; no `CLAUDE.md`
- [ ] No writes into `project-cwd`
- [ ] One-way refs only
