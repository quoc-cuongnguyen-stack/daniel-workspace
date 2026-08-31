# BUG-112: Deleting a mixed text+media community comment does not refresh the list

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

After deleting a community post comment that had both text and an attached image, the comment stayed on screen. The list only caught up after a hard page reload.

## Reproduction Steps

1. Open a community feed post and expand comments.
2. Submit a comment with text and a photo.
3. Delete that comment and confirm.

**Expected behavior:** The comment disappears immediately. No full page reload is needed.
**Actual behavior:** The comment stays visible until the user reloads the page.

## Evidence

`useDeleteCommunityComment` did not update Apollo cache. `getPostComments` uses `cache-and-network` and kept the deleted row. Deleting a mixed comment also changed `commentMediaIds`, which re-rendered the post and re-ran a comments effect that replaced the local list with that stale fetch.

## Tracing Evidence

Frontend cache / list-sync bug. Jaeger was not running locally.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching exception: the UI stayed stale without throwing.

## Root Cause Analysis

1. Delete only filtered React state when `success` was true. The cached `getPostComments` list still held the comment.
2. The comments effect listed `localCommentDocs` as a dependency. Setting the overlay after delete re-applied `fetchedComments.docs`, which still contained the mixed comment.
3. Mixed comments change media-query variables on delete, so that stale fetch was more likely to land than for text-only comments.

**Related files:**
- [communities.cache.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.ts)
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix Applied

Evict `getPostComments` after a successful delete so observers refetch without a hard reload. Keep deleted ids out of later page merges. Drop the comment from the local overlay (and its media overlay) immediately.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.cache.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Mixed comment is removed from the docs list; a stale fetch cannot put it back; `getPostComments` is evicted on success.

## Lessons Learned

A local overlay is not enough when a cache-and-network query can rewrite the same list. Evict the list field, and keep deleted ids out of the next merge.

## References

- Related bug cases: BUG-110, BUG-111
