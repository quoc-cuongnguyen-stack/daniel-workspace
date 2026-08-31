# BUG-133: Pre-commit cyberskill lint-staged blanks package.json

> **Status:** ✅ Fixed (project hook workaround)
> **Date Found:** 2026-08-20 (recurring)
> **Date Fixed:** 2026-08-30
> **Project:** SSL / ssl-fe-user
> **Severity:** 🟠 High (blocks commits; corrupts package.json)

---

## Description

`git commit` hangs in pre-commit. `package.json` gets `"eslint": ""` / `"lint-staged": ""`, then CyberSkill retries `pnpm install --ignore-scripts` in a loop.

## Root Cause Analysis

Hook was `pnpm exec cyberskill lint-staged`. That CLI resolves the `lint-staged` command via `setupPackages({ install: true })`, which fetches the latest version from the npm registry.

On registry failure, `getPackage` returns `isInstalled: false` and `latestVersion: ""` even when the dep is already declared and installed. `updatePackage` then writes the empty version into `package.json` and triggers install retries.

## Fix Applied

- Added `.simple-git-hooks.cjs` (wins over `.simple-git-hooks.json` in simple-git-hooks lookup) to run:
  - `pnpm exec lint-staged --config @cyberskill/shared/.../lint-staged`
  - `pnpm exec commitlint --edit "$1" --config @cyberskill/shared/.../commitlint`
- Regenerated `.git/hooks` via `pnpm exec simple-git-hooks`.
- Aligned `.simple-git-hooks.json` the same way (still may be rewritten by `cyberskill ready`; `.cjs` remains authoritative).

## Verify

```bash
# Should not mutate package.json eslint/lint-staged versions
pnpm exec simple-git-hooks
git commit  # with a real staged change — no "Updated eslint to version" loop
```

## Lessons Learned

Do not route every commit through CyberSkill’s package auto-heal when registry access is unreliable. Prefer direct lint-staged/commitlint with shared configs.

## References

- Related skips: `SKIP_SIMPLE_GIT_HOOKS=1` used previously as temporary workaround
