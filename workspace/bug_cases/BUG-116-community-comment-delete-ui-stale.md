# BUG-116: Deleted community comment text and media stay on screen

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

`deleteCommunityComment` succeeds and returns the deleted comment, but the feed still shows that comment's text and attached (often Pending) media until a later refetch or reload.

## Reproduction Steps

1. Open a community feed post and expand comments.
2. Submit a comment with text and a photo (Pending badge is fine).
3. Click Delete and confirm. The GraphQL mutation succeeds.

**Expected behavior:** The whole comment block (text, media tile, container) disappears immediately.
**Actual behavior:** The row stays visible with its original content and pending image.

## Evidence

Development feed screenshot: comment "123" + Pending thumbnail still on screen after a successful `deleteCommunityComment`. Network tab shows the mutation completed.

## Tracing Evidence

Frontend cache / list-sync bug. Jaeger was not required.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching exception: the mutation succeeded and the UI stayed stale.

## Root Cause Analysis

Soft-delete returns the same `T_CommunityComment` with `content` and `mediaIds` still set. Apollo writes that entity back. `getPostComments` is `cache-and-network`, so a refetch can put the row back before React records the deleted id. Evicting only the list field is not enough if the normalized comment object is rewritten, and filtering via a ref does not re-render.

**Related files:**
- [communities.cache.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.ts)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix Applied

Evict the comment entity and `getPostComments` on success. Keep deleted ids in React state (not only a ref) and exclude them from the visible list, including when a refetch still contains the soft-deleted row. Mark the id excluded as soon as delete is confirmed so an in-flight refetch cannot flash the body back; roll back that exclusion if the mutation fails.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.cache.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts), [communities.cache.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.test.e2e.ts), [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` then `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** BE unit 185 passed. FE unit 149 passed. FE e2e 11 passed. `getComments` always queries `isDel: { $ne: true }`. `deleteComment` writes `isDel: true`. After a simulated reload (empty deleted ids + fresh Apollo cache), the mixed comment text and pending media are absent.

## Lessons Learned

A soft-delete payload that still includes body fields will rehydrate the UI unless the entity is evicted and the visible list is filtered by id. After a hard reload, React state and Apollo cache are empty: `getComments` must keep `isDel: { $ne: true }` so the row never comes back from the network.

## References

- Related bug cases: BUG-112, BUG-114
- Knowledge items: [community-comment-delete-ui-stale](file:///Users/daniel/.gemini/antigravity-ide/knowledge/community-comment-delete-ui-stale/)
