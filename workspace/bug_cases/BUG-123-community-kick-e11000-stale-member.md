# BUG-123: Kick returns success but member stays (E11000 soft-delete)

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-28
> **Date Fixed:** 2026-08-28
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

Kicking Allan as Secretswingerlust returned `moderateCommunityMember` `success: true`, but Allan stayed in Members and `getCommunity.memberCount` stayed unchanged.

## Reproduction Steps

1. Sign in as Secretswingerlust (community admin of Community name 01).
2. Kick Allan (who had previously left/been kicked and rejoined via application approve).
3. Observe GraphQL success while UI/`memberCount` still include Allan.

**Expected behavior:** Soft-delete succeeds; member gone; `memberCount` decrements.
**Actual behavior:** Moderation log saved; membership row still active.

## Evidence

Mongo before fix for Allan (`5d9a565f-...`) in community `071939c5-...`: one `isDel: false` row **and** one `isDel: true` row.

## Tracing Evidence

**Jaeger Trace IDs:**
- Failure (pre-fix): [`18ef45439398fa060691c11b5feba395`](http://localhost:16686/trace/18ef45439398fa060691c11b5feba395)
- Success (post-fix): [`cb9602ef2bb26f01aa4d6c9410042d23`](http://localhost:16686/trace/cb9602ef2bb26f01aa4d6c9410042d23)

**Span Breakdown:**

| Span | Operation | Error? |
|------|-----------|--------|
| DB | `mongoose.CommunityMember.findOneAndUpdate` | E11000 on `idx_community_member_unique` (pre-fix) |
| DB | `mongoose.ModerationLog.save` | no (still ran) |
| DB | `mongoose.CommunityMember.deleteMany` then `findOneAndUpdate` | no (post-fix) |

**Key Observations:**
- Unique index `(communityId, userId, isDel)` allows only one soft-deleted row.
- Approve used `getCommunityMember` (active only) → created a second row after prior soft-delete.
- Kick ignored update failure and still returned log success.

## PostHog Evidence

Local localhost reproduction. No production exception consulted.

## Root Cause Analysis

`moderateCommunityMember` soft-deleted without checking success. Prior soft-deleted membership + re-approve `createCommunityMember` left two rows; setting the active row to `isDel: true` duplicated the unique key.

**Related files:**
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)
- [community-application.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.ts)
- [community-member.model.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-member.model.ts)

## Fix Applied

1. Before KICK/BAN soft-delete: hard-delete `{ communityId, userId, isDel: true }` rows.
2. If soft-delete fails → `throwError` (no moderation log success).
3. Application approve: `getCommunityMemberByUser` + revive (same as `joinCommunity`).

## Unit / Regression Test

- **Test File:** [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts), [community-application.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.test.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community.controller.test.ts src/modules/community/community-application.controller.test.ts`
- **Test Results:** 30 passed — purge+kick success, soft-delete fail does not create log, approve revives soft-deleted member.

## Lessons Learned

- Soft-delete + unique indexes that include `isDel` require revive-on-rejoin, never duplicate creates.
- Never report success from a side-effect (moderation log) when the primary mutation failed.

## References

- Knowledge item: [community-kick-e11000-stale-member](file:///Users/daniel/.gemini/antigravity-ide/knowledge/community-kick-e11000-stale-member/)
- Jaeger failure: [18ef45439398fa060691c11b5feba395](http://localhost:16686/trace/18ef45439398fa060691c11b5feba395)
- Jaeger success: [cb9602ef2bb26f01aa4d6c9410042d23](http://localhost:16686/trace/cb9602ef2bb26f01aa4d6c9410042d23)
