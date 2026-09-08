# ICM Project Factory

Build one project-specific ICM instance per target `project-cwd`. Do not bake a single pipeline into this sandbox.

## Task Routing

| Task | Go To | One job |
|------|-------|---------|
| Observe a target repo | `stages/01-survey/CONTEXT.md` | Record stack, layout, conventions. Do not design ICM. |
| Map five layers | `stages/02-map-layers/CONTEXT.md` | Bind L0–L4. Do not scaffold folders. |
| Pick a pipeline | `stages/03-select-workflow/CONTEXT.md` | Choose one workflow. Do not write the product tree. |
| Write the instance | `stages/04-scaffold/CONTEXT.md` | Create `.icm/projects/<slug>/`. Do not run it. |
| Audit the instance | `stages/05-validate/CONTEXT.md` | Pass/fail checks. Do not refactor. |

## Factory vs product

- Factory (this folder): stable. Configure once.
- Product: `.icm/projects/<slug>/`. Created by stage 04. Changes per project.
- Never write into `project-cwd`. Never create `CLAUDE.md`.

## References

| Resource | Location | Load |
|----------|----------|------|
| Conventions | `_config/conventions.md` | Named section only |
| Discovery | `_config/discovery-rules.md` | Named section only |
| Pipeline catalog | `_config/pipeline-templates.md` | Template catalog |
| Token budget | `_config/token-budget.md` | Caps section |
| Run input skeleton | `shared/templates/run-input.md` | When starting a run |
| Setup | `setup/questionnaire.md` | One-time factory setup |
| Human guide | `Huong-dan-ICM-Factory.docx` | Full walkthrough (Word) |

## Execution order

`01-survey` → checkpoint → `02-map-layers` → checkpoint → `03-select-workflow` → checkpoint → `04-scaffold` → checkpoint → `05-validate`.
