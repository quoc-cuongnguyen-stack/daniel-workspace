# 02 — Map layers

One job: bind five layers for this slug. Do not scaffold folders or pick stages.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Layer 2 | This file | Full | Contract |
| Layer 3 | `.icm/_config/conventions.md` | Five-layer | Binding rules |
| Layer 4 | `../01-survey/output/<slug>-survey.md` | ConventionsObserved + Layout | Discovered facts |
| Target | Path from survey | First ~80 lines | Layer 0 candidate |

## Process

1. Bind Layer 0 to the target `AGENTS.md` path (pointer, not copy). If absent, bind repo-root `AGENTS.md` and mark `ASSUMPTION:`.
2. Bind Layer 3 to discovered rules only.
3. Bind Layer 4 to `.icm/projects/<slug>/` `input/` and stage `output/`.
4. Estimate tokens per file/section. Stay inside 2,000–8,000 per later product stage.
5. Run the audit. Write the output. Stop.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Layer map | `output/<slug>-layer-map.md` | YAML header + L0–L4 paths, sections, token estimates |

## Checkpoint

Stop. Human confirms Layer 0 path and that the target will not be written.

## Audit

- [ ] All five layers named
- [ ] Layer 3 has no tickets
- [ ] Layer 4 has no style guides
- [ ] No `CLAUDE.md`
- [ ] Each load names a section
