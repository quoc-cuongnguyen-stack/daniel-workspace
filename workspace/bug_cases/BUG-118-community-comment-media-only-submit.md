# BUG-118: Media-only community comments fail with "Failed to post the comment"

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

Posting a community comment with a photo or video and no text failed with "Failed to post the comment." Text-only and text-with-media comments still needed to work.

## Reproduction steps

1. Open a community feed post and expand comments.
2. Attach a photo or video. Leave the text box empty.
3. Click Comment.

**Expected behavior:** The comment is created and the media shows in the thread (feed and lightbox).
**Actual behavior:** The UI showed "Failed to post the comment."

## Evidence

```
Failed to post the comment.
```

That copy is `communities.feed.comment_error`. The composers showed it when `createCommunityComment.success` was false (they ignored `message`) or when the catch was not an `Error`.

## Tracing evidence

Jaeger was not required. This is the comment composer + create path.

## PostHog evidence

No linked session.

## Root cause analysis

BUG-115 made mongoose `content` optional and allowed empty text when `mediaIds` is present. The UI still failed because:

1. Admin/staff community uploads bypassed moderation and returned an empty `moderationMediaId`. The composer then sent `content: ""` and `mediaIds: []`. Create returned `success: false` without a thrown `Error`, so the client showed the generic toast.
2. A successful create followed by a failed author re-fetch also returned `success: false`.
3. The lightbox sidebar rendered `comment.content` only, so a media-only comment looked empty even when create succeeded.

**Related files:**
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [community-comment.model.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-comment.model.ts)
- [upload.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/upload/upload.util.ts)

## Fix applied

- Shared `buildCommunityCommentCreateInput` sends `content: ""` with media ids for media-only comments, and refuses to mutate when there is neither text nor a stored media id.
- Community uploads no longer bypass moderation, so they return a `moderationMediaId`.
- Create still succeeds if author re-fetch fails after a successful write.
- Feed and lightbox overlay uploaded media ids and render `CommunityCommentBody` for media-only, text-only, and mixed comments.

## Unit / Regression test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts), [community-comment.model.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-comment.model.test.ts), [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts), [upload.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/upload/upload.util.test.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` and `pnpm --prefix ssl-fe-user test:unit` then `test:e2e`
- **Test Results:** Media-only, text-only, and text-with-media payloads succeed. Empty body is rejected. Community uploads do not bypass moderation. 193 BE unit, 155 FE unit, 9 FE e2e passed.

## Lessons learned

A comment body is text or stored media ids. Empty upload ids look like an empty comment. Do not treat a failed author re-fetch as a failed create.

## References

- Related bug cases: BUG-072, BUG-110, BUG-115
