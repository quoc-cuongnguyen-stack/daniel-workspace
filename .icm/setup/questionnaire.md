# Factory setup

Answer once. This configures the factory, not a product run.

## Defaults

- Artifact home: `.icm/projects/<slug>/`
- Write into target repo: no
- Layer 0 name: `AGENTS.md` (never `CLAUDE.md`)
- Phase 1 runtime: Cursor reads markdown. No harness stage loader.

## Questions

1. Default `project_cwd` for the next run (absolute path)?
2. Default slug (kebab-case)?
3. Preferred first template (`feature` / `debug` / `test`)?
4. Any factory rule to add to `_config/conventions.md` (one sentence)?

Write answers under `setup/answers.md` if you want them persisted. Stage 01 still requires a per-run `input/run.md`.
