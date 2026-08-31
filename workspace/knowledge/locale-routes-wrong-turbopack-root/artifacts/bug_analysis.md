# BUG-101 analysis

## Symptom
`localhost:8001/en` hung on `Compiling /[locale]`, or crashed with `Can't resolve 'tailwindcss' in '.../SSL'`, or `couldn't find next/package.json` from `ssl-fe-user/src/app`.

## Cause
A leftover Cursor SDK playground at the repo root (`SSL/package.json` + `SSL/pnpm-lock.yaml`) made Next treat `SSL/` as the workspace. Enhanced-resolve used `SSL/package.json` as the description file and looked for `tailwindcss` / `next` in `SSL/node_modules`. Deleting only the lockfile made this worse.

## Fix
Move the playground to `daniel_workspace/cursor-sdk/`. Remove `SSL/node_modules` and `SSL/pnpm-lock.yaml`. Do not run `pnpm i` at `SSL/`. Restart `pnpm dev` from `ssl-fe-user`.
