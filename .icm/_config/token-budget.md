# Token budget

Target load per stage: 2,000–8,000 tokens. Prevention, not compression.

## Caps

- Stage `CONTEXT.md`: 80 lines.
- Reference / `_config` files: 200 lines.
- Layer 0 `AGENTS.md`: keep short; load Full only because it is short.
- Factory Layer 1: load Task Routing only unless the Inputs table says Full.

## Section-load rules

1. Open the Inputs table first. Load nothing else yet.
2. Read the named section. Stop at the next heading.
3. If a file has no matching heading, load the first 80 lines and record `ASSUMPTION: section missing`.
4. Never load a previous stage's entire `output/` directory. Load the named artifact.
5. Never load the target codebase. Load listed files and scopes only.

## Estimates (rough)

| Artifact | Tokens |
|----------|--------|
| Root `AGENTS.md` | ~400 |
| Stage `CONTEXT.md` | ~200–500 |
| One `_config` section | ~200–400 |
| One survey/pipeline output | ~400–800 |
