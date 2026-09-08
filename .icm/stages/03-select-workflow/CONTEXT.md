# 03 — Select workflow

One job: pick one pipeline. Do not write the product tree.

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Layer 3 | `.icm/_config/pipeline-templates.md` | Template catalog | Allowed pipelines |
| Layer 4 | `../01-survey/output/<slug>-survey.md` | CandidateWorkflows | Evidence |
| Layer 4 | `../02-map-layers/output/<slug>-layer-map.md` | L3 + L4 bindings | Where artifacts live |

## Process

1. Pick one template. Default for app repos: Feature Implementation.
2. Name stages. One atomic job each. Spec does not code. Implement does not audit.
3. Draft per-stage inputs as paths + sections only (one-way handoffs).
4. Run the audit. Write the output. Stop.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| Pipeline | `output/<slug>-pipeline.md` | YAML header (`template`) + stage table (id, job, inputs, output) |

## Checkpoint

Stop. Human may swap the template or drop a stage.

## Audit

- [ ] At least three stages
- [ ] Each stage has Inputs, Process, Outputs
- [ ] Handoffs are one-way
- [ ] No stage both implements and audits
