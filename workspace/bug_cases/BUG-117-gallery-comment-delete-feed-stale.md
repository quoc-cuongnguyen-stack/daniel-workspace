# BUG-117: Gallery modal comment delete does not update the feed

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

Deleting a comment in the Gallery / media modal hides it in that modal, but the same comment stays on the community feed. GraphQL then reports `DeleteCommunityComment: Comment not found` if the feed tries to delete it again.

## Reproduction Steps

1. Open a community Gallery, open a post in the media modal, delete a comment (text + pending media is fine).
2. Close the modal and open `/en/communities/<slug>/feed` with comments expanded.

**Expected behavior:** The comment is gone in the modal, on the feed, and after reload.
**Actual behavior:** The modal thread is empty of that comment. The feed still shows it (for example "321" + Pending). A second delete throws Comment not found.

## Evidence

Local feed screenshot after a gallery-modal delete: comment "321" with Delete still under the Tesst post. Network/GraphQL: `DeleteCommunityComment: Comment not found`.

## Tracing Evidence

Frontend sibling-state plus idempotent soft-delete. Jaeger was not required.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching exception besides the GraphQL not-found payload.

## Root Cause Analysis

`CommunityPost` and `LightboxCommentsPanel` each keep their own comment overlay. A successful modal delete never told the feed to drop that id, so `localCommentDocs` could keep showing it. `getCommunityComment` ignored `isDel: true` rows, so a second delete returned Comment not found. The lightbox `await deleteComment` had no try/catch, so a thrown not-found left the modal hidden while the feed still had the row.

**Related files:**
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [community-comment.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-comment.controller.ts)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(main)/(communities)/communities/[communitySlug]/feed/page.client.tsx)

## Fix Applied

Soft-delete is idempotent: lookup by id including `isDel`, return success if already deleted. The feed page keeps a shared `hiddenCommentIds` list so a modal delete also hides the row on `CommunityPost`. GraphQL `Comment not found` is treated as already gone (try/catch), not as a failed hide.

## Unit / Regression Test

- **Test File:** [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts), [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` then `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** BE 187 passed. FE unit 151 passed. FE e2e 12 passed. Already-deleted comments return success and do not throw. `DeleteCommunityComment: Comment not found` is treated as gone. A modal-hidden id is excluded from the feed overlay.

## Lessons Learned

Two comment lists on one community page must share deleted ids. Soft-delete lookups that skip `isDel` rows turn a second delete into a GraphQL 404.

## References

- Related bug cases: BUG-116, BUG-114, BUG-112
- Knowledge items: [gallery-comment-delete-feed-stale](file:///Users/daniel/.gemini/antigravity-ide/knowledge/gallery-comment-delete-feed-stale/)
