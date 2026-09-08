# Factory conventions

Canonical ICM rules for this sandbox. Other files point here. Do not duplicate.

## One stage, one job

Each stage has one atomic responsibility. A survey does not design. A scaffold does not run the product pipeline. An audit does not rewrite files.

## Plain text as interface

Handoffs are markdown only. No databases, binary blobs, or chat-memory state. The next stage reads disk.

## Five-layer

- Layer 0: `AGENTS.md` only. Never `CLAUDE.md`.
- Layer 1: root or project `CONTEXT.md` — where to go.
- Layer 2: stage `CONTEXT.md` — what to do (Inputs, Process, Outputs).
- Layer 3: factory / project `_config` and `references` — stable constraints.
- Layer 4: `input/` and `output/` — this run only.

Layer 3 must not hold tickets. Layer 4 must not hold style guides.

## One-way references

If A reads B, B does not read A. Stage `0N` may read `0N-1` output. Earlier stages never read later outputs.

## Selective loading

Inputs tables name a file and a section. Do not load whole files unless the table says Full. Target budget is 2,000–8,000 tokens per stage. See `token-budget.md`.

## Canonical sources

Each fact has one home. Repeat a pointer, not the rule. The moment the same rule exists in two files, they drift.

## Human edit surface

Every `output/*.md` is writable. Subsequent stages consume whatever the human left. Do not reconstruct a previous answer from chat.

## Validation

Binary pass/fail only. Cite `file:section`. No "looks good". Re-run `05-validate` after human edits unless the folder tree changed (then re-run `04-scaffold`).
