# Pipeline templates

Catalog only. Stage 03 picks one. Do not run these here.

## Template catalog

### Feature Implementation (default for app repos)

Use when the target has modules and the repeatable job is ship a change.

| Stage | One job |
|-------|---------|
| 01-spec | Define WHAT and WHEN. No code. |
| 02-contracts | Types, interfaces, API shapes. No implementation. |
| 03-implement | Write code inside discovered placement rules. No audit. |
| 04-verify | Run target scripts that exist. No refactor. |
| 05-audit | Pass/fail against spec and conventions. No new features. |

### Debug (optional)

Use when the target's evidence is bug journals, traces, or reproduce-then-fix loops.

`01-reproduce` → `02-trace` → `03-analyze` → `04-fix` → `05-document`

### Test (optional)

Use when the target's evidence is a same-turn unit + e2e loop.

`01-identify` → `02-unit` → `03-e2e` → `04-report`

## When to pick another

- Prefer Feature Implementation unless survey `CandidateWorkflows` names a stronger match.
- Do not merge implement and audit into one stage.
- Spec stages do not prescribe HOW. Build stages stay inside Layer 3 quality floor.
