# BUG-115: Media-only community comments fail mongoose content validation

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

Submitting a community post comment with a photo or video and no text failed with `CommunityComment validation failed: content: Path \`content\` is required.`

## Reproduction Steps

1. Open a community feed post and expand comments.
2. Attach a photo. Leave the text box empty.
3. Click Comment.

**Expected behavior:** The comment is created and the image shows in the thread.
**Actual behavior:** The mutation fails. Mongoose rejects the document because `content` is required.

## Evidence

```
CommunityComment validation failed: content: Path `content` is required.
```

The feed composer already allows submit when `mediaCount > 0` even if content is blank (same as Create Post).

## Tracing Evidence

Mongoose schema rejected the write. Jaeger was not required.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No linked session. The client sent `content: ""` with `mediaIds`.

## Root Cause Analysis

`CommunityComment.content` was `required: true`. Mongoose treats an empty string as missing. `Input_CreateCommunityComment.content` was `String!`. `createComment` passed the doc through without a body check. This is the comment version of BUG-072 (gallery posts).

**Related files:**
- [community-comment.model.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-comment.model.ts)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [community-comment.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-comment.type.ts)
- [community-post.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.graphql)

## Fix Applied

`content` is optional on the schema and defaults to `""`. GraphQL input `content` is optional. `createComment` accepts text or at least one media id, and rejects a comment with neither.

## Unit / Regression Test

- **Test File:** [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts)
- **Command:** `pnpm --prefix ssl-be test:unit`
- **Test Results:** Media-only comment is created with empty content. A comment with neither text nor media is rejected.

## Lessons Learned

Required string fields reject empty captions. Media-only comments need the same empty default and body check as media-only posts.

## References

- Related bug cases: BUG-072, BUG-110
