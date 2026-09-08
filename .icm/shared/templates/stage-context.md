# {{stage_id}} — {{title}}

One job: {{one_job}}

## Inputs

| Source | File / Location | Section / Scope | Why |
|--------|-----------------|-----------------|-----|
| Layer 0 | {{agents_md_path}} | {{section}} | Target identity |
| Layer 3 | {{reference_path}} | {{section}} | Constraints |
| Layer 4 | {{prior_output}} | {{section}} | This run |

## Process

1. {{step}}
2. Run the audit.
3. Write the output. Stop.

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| {{name}} | `output/{{filename}}` | Markdown with YAML header (`slug`, `stage`, `written_at`) |

## Checkpoint

{{checkpoint}}

## Audit

- [ ] {{check}}
