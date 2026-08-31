# BUG-132: Kick re-apply requires two Request Access clicks

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-30
> **Date Fixed:** 2026-08-30
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

After being kicked from a private community, the user clicks **Request Access** on the feed gate and lands on `/apply`, but must click **Request Access** again before the application form appears.

## Reproduction Steps

1. Join a private community; then get kicked (or leave while the prior application stays `APPROVED`).
2. Open the community feed → members-only gate → click **Request Access**.
3. Observe `/communities/<slug>/apply`.

**Expected:** Apply form is ready (title/description/moderator notice + send controls).
**Actual:** Intermediate gate again: Members only + description + **Request Access** (second click required).

## Goldfish evidence

- Feed gate: `f36e38982e4badce7052b033e9253b93b283347c1293af5f0e49d41bb8f38888`  
  `https://development.secretswingerlust.com/en/communities/test-johni/feed` (2026-08-30 09:26)
- Apply intermediate gate: `20cd69c49679cdb2d3880751200b464c8c152cbabc1465e8dc3f19dfa69c7ce1`  
  `https://development.secretswingerlust.com/en/communities/test-johni/apply` (2026-08-30 09:28)  
  Shows Members only / Dette er en test / moderator notice / **Request Access** with no form.

## Root Cause Analysis

Kick/leave leaves an `APPROVED` application row without membership. `canReapplyToCommunity` correctly treated that as re-apply, but the apply page rendered a second CTA gate (`showFormerMemberGate`) that only set `reapply=true`. Combined with the feed gate CTA, users needed two **Request Access** clicks.

## Fix Applied

- Added `shouldAutoOpenCommunityApplyForm` — `APPROVED` + no membership opens the form immediately.
- Apply page uses that flag to skip the intermediate CTA while keeping Members only + description copy above the form.
- Rejected applications still use explicit **Re-apply**.

## Unit / Regression Test

- `communities.type.test.unit.ts` — `shouldAutoOpenCommunityApplyForm`
- `communities.type.test.e2e.ts` — kick re-apply auto-open vs rejected
- `apply/page.client.test.unit.tsx` — former member sees send form, not a second Request Access

## Lessons Learned

Feed-gate navigation to `/apply` already expresses intent to request access. Former-member states that only need a form must not insert another identical CTA.

## References

- Related: BUG-099 (rejoin after leave)
