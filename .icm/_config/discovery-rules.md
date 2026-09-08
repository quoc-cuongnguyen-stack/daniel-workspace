# Discovery rules

How to infer conventions from a target `project-cwd`. Do not import SSL or harness rules unless the survey saw them.

## Survey checklist

Record evidence with a path. If missing, write `ASSUMPTION:` and stop inventing.

1. **Identity** — `package.json` `name`; README first heading.
2. **Layer 0** — deepest `AGENTS.md` from cwd up to git root. Note if absent.
3. **Scripts** — `package.json` `scripts` keys only. Verification later uses those that exist among `typecheck`, `lint`, `test`, `build`.
4. **Layout** — one level of directory names under cwd. Note `src/modules`, `src/shared`, `lib/`, `packages/`, `apps/` only if present.
5. **Naming** — sample 5–10 source files. Record `I_` / `T_` / `E_` prefixes, kebab-case files, or other prefixes only if observed.
6. **Placement** — where new modules go (`src/modules/<area>/`, `lib/`, package folders). Cite one existing example.
7. **Tests** — test file pattern if any (`*.test.ts`, `*.test.unit.ts`).
8. **Workflows** — candidate repeatable jobs (feature, bugfix, QA) with one-line evidence each.

## What not to invent

- Do not assume `src/modules` or `I_` / `T_` / `E_` because another project uses them.
- Do not assume bun, pnpm, or npm beyond the target's lockfile / scripts.
- Do not copy this sandbox's `harness/lib/` layout onto the target.

## Evidence format

```
convention: kebab-case files
path: src/foo/user-service.ts
```
