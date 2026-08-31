# BUG-136: Last-admin leave left empty community with Moderator Panel

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-31
> **Date Fixed:** 2026-08-31
> **Project:** SSL (ssl-be / ssl-fe-user)
> **Severity:** 🟠 High

---

## 🔍 Description

Leaving as the last admin soft-deleted membership and marked the community `ORPHANED` instead of deleting it when empty. A creator without an active membership still saw private feed posts, Create Post, and Moderator Panel via `createdById` / FE `isCreator` bypasses. Pending applications on deleted/orphan communities could still be approved.

## 🔄 Reproduction Steps

1. Create a private community (sole admin/member).
2. Leave (or self-kick path that removed membership).
3. Open `/communities/<slug>/feed`.

**Expected behavior:** Community deleted whenever the final ADMIN/MODERATOR leaves, is removed, or is demoted—even when regular members remain. Departed creator is a visitor (private gate, no panel/compose).
**Actual behavior:** 0-member leftover community still showed Moderator Panel + Create Post + feed for the former creator.

## 📸 Evidence

Screenshot of private “Secret” community feed: Private, **0 members**, Moderator Panel + Create Post still visible.

## 🔭 Tracing Evidence

N/A (policy + FE membership gate; reproduced from UI + code path).

## 📊 PostHog Evidence

N/A for this capture-driven fix.

## 🧠 Root Cause Analysis

1. `leaveCommunity` set `ORPHANED` when remaining ADMIN count hit 0; did not delete when empty and ignored remaining members/moderators.
2. BE `assertCanViewCommunity` / `checkCommunityMembership` / `isElevatedCommunityMember` treated `createdById` as membership.
3. FE `isCreator` alone unlocked `canModerate` / private feed without `ownMember`.
4. Notifications and application review still targeted / worked for departed creators and deleted communities.

**Related files:**
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)
- [community.policy.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.policy.ts)
- [community-post.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.ts)
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## 🔧 Fix Applied

- Final ADMIN/MODERATOR leave, removal, or demotion → immediate tombstone via `tombstoneLiveCommunity`; no automatic promotion and no new `ORPHANED`.
- Tombstone the community before child/external cleanup, then soft-delete memberships and applications so join/apply/review close immediately.
- Fail closed when member/staff counts fail (`Unable to verify community membership`); do not treat a failed count as 0.
- After a successful staff leave that believed other staff remained, re-count and tombstone if none remain (concurrent last-staff race).
- `updateCommunity` writes only `{ id: authorizedCommunity.id }`, never the raw client filter.
- Reject self kick/ban; hide own Kick/Ban in moderator UI.
- Drop `createdById` access bypass; private view / elevate / notify = live ADMIN/MOD membership only.
- `canShowModeratorPanel` requires live ADMIN/MOD membership or platform admin; creator+MEMBER is not authorized.
- `reviewApplication` rejects deleted community.

## 🧪 Unit / Regression Test

- **Test File:** community.controller.test.ts, community.policy.test.ts, community-application.controller.test.ts, community-notification.service.test.ts, communities.type.test.unit.ts, communities.type.test.e2e.ts
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community.controller.test.ts src/modules/community/community.policy.test.ts`; FE unit + e2e communities.type tests
- **Test Results:** Last-member/staff leave deletes; count failure does not delete; concurrent last-staff leave tombstones; update writes authorized id only; departed creator blocked from private feed/panel.

## 📝 Lessons Learned

- Creator identity ≠ active membership after leave/kick.
- A community without active staff must be deleted, not orphaned, even if regular members remain.
- Soft-delete applications with the community so approve cannot revive a ghost.

## 🔗 References

- Plan: last_admin_community_delete
