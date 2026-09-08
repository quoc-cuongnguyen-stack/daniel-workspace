# Feature Implementation stages

Skeleton list for factory stage 04 when the chosen template is Feature Implementation. Fill paths from the survey. Keep each generated `CONTEXT.md` under 80 lines.

## 01-spec

One job: define WHAT and WHEN. No code.

- Inputs: target `AGENTS.md` (Architecture only); project `_config/conventions.md`; `input/` ticket or prompt.
- Output: `output/spec.md` — problem, acceptance, out of scope.
- Checkpoint: human locks acceptance before contracts.

## 02-contracts

One job: types, interfaces, API shapes. No implementation.

- Inputs: `01-spec/output/spec.md` (Acceptance); discovered naming section.
- Output: `output/contracts.md` — names and placements only.
- Use `I_` / `T_` / `E_` and `src/modules` only if `_config` recorded them.

## 03-implement

One job: write code in the target using discovered placement. No audit.

- Inputs: contracts (full); conventions Placement section.
- Output: `output/implement-log.md` — paths touched under `project-cwd` (read/write of product code is a later human decision; this factory instance still defaults to planning-only unless the human says otherwise).
- Default for instances in this sandbox: describe edits; do not write into `project-cwd` unless the human overrides `write_into_target`.

## 04-verify

One job: run scripts that exist on the target. No refactor.

- Inputs: target `package.json` scripts; implement-log.
- Output: `output/verify.md` — command, result, honest scope.

## 05-audit

One job: pass/fail against spec and conventions. No new features.

- Inputs: spec Acceptance; contracts; verify.md; conventions Validation.
- Output: `output/audit.md` — binary checks with `file:section`.
