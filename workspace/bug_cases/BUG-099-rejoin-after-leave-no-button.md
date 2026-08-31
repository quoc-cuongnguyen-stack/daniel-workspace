# BUG-099: No join request button after leaving a community

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

After leaving a community, former members do not see a control to join again or send a new join request.

## Reproduction Steps

1. Join a private community (application approved).
2. Leave the community.
3. Open the same community from the list or feed / apply page.

**Expected:** Join / Request Access / Re-apply is available.
**Actual:** No usable control to request access again (stale APPROVED application + apply/gate UI).

## Root Cause Analysis

Leaving soft-deleted membership but left the prior `APPROVED` community application intact. Apply/gate UI and `getMyApplication` could still surface that row, so former members did not get a clean re-apply path. Leave cache also did not invalidate application queries.

## Fix Applied

- Backend `leaveCommunity` soft-deletes the user's applications for that community.
- Backend `applyToCommunity` reuses APPROVED/REJECTED rows as a fresh PENDING request when the user is not a member.
- `getMyApplication` prefers PENDING over older APPROVED rows.
- FE leave cache evicts `getMyCommunityApplication` / `getMyCommunityApplications`.
- Apply page treats APPROVED without membership as re-apply (same as REJECTED).
- Shared helpers `canReapplyToCommunity` / `canShowCommunityJoinCta` for gate/card CTA visibility.

## Unit / Regression Test

- `ssl-be` `community.controller.test.ts` leave clears applications
- `ssl-be` `community-application.controller.test.ts` reuses APPROVED application
- `ssl-fe-user` `communities.type.test.unit.ts` / `.test.e2e.ts` re-apply helpers
- `ssl-fe-user` `communities.cache.test.unit.ts` leave evicts application queries

## Lessons Learned

Membership leave and application lifecycle must stay in sync for private communities, or rejoin CTAs look broken even when membership is correctly cleared.

## References

- Related: BUG-097 (leave cache), BUG-098 (orphan banner gate)
