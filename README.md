# daniel-workspace

Personal sandbox. Not [quoc-cuongnguyen-stack/SSL](https://github.com/quoc-cuongnguyen-stack/SSL.git). SSL stays untouched.

## Layout

- `harness/` — portable agent loop (AI SDK + Claude). Point it at any repo with `pnpm start -- <project-cwd> "<prompt>"`. Code lives under `harness/lib/`.
- `.icm/` — **ICM Project Factory**: survey a target repo and scaffold a per-project ICM under `.icm/projects/<slug>/`. See the guide below.
- `AGENTS.md` — Layer 0 rules for this sandbox (factory identity, no writes into target repos).

## ICM factory

Factory lives in **this sandbox** (`daniel-workspace`). It surveys a **real project** by path (`project-cwd`) and writes ICM artifacts under `.icm/projects/<slug>/` — not into the target repo.

**Guide (Word):** [`.icm/Huong-dan-ICM-Factory.docx`](.icm/Huong-dan-ICM-Factory.docx) — includes how to point `project-cwd` at another repo, or copy `.icm/` into that repo and type `Build ICM`.

Quick start (Cursor must be opened on `daniel-workspace`, not the target repo):

1. Create `.icm/projects/<slug>/input/run.md` from [`.icm/shared/templates/run-input.md`](.icm/shared/templates/run-input.md) — **absolute** `project_cwd`, kebab-case `slug`.
2. Prompt the agent explicitly, e.g. run stage `01-survey` after reading [`AGENTS.md`](AGENTS.md) and [`.icm/CONTEXT.md`](.icm/CONTEXT.md).
3. One factory stage at a time; review each `output/` before the next stage.

Pasting a generic ICM survey prompt alone is **not** enough — you need `run.md` and a stage-specific prompt. `harness/` does not auto-load `.icm/stages/` in v1.

## Harness setup

Needs Node 22+ and pnpm.

```bash
cd harness
pnpm install
cp .env.example .env
# Put a console.anthropic.com API key in harness/.env
pnpm typecheck
pnpm start -- . "Read package.json, then tsconfig.json, then index.ts, then summarize everything"
```

`pnpm start -- <project-cwd> "<prompt>"` points the loop at any repo. SSL is just a cwd; setup does not write into it.
