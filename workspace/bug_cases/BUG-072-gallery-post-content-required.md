# BUG-072: Gallery post without caption fails mongoose content validation

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-be)
> **Severity:** 🟠 High

---

## Description

Publishing a community post with photos or video and no caption failed with "Failed to publish the post." The server logged `CommunityPost validation failed: content: Path content is required.`

## Reproduction steps

1. Open a community feed as a member.
2. Attach a photo or video. Leave the text box empty.
3. Click Post.

**Expected behavior:** The post is published and appears in the feed and gallery.
**Actual behavior:** Publish fails. Mongoose rejects the document because `content` is required.

## Evidence

```text
Failed to publish the post.
[1:04:22 PM]  ERROR  CommunityPost validation failed: content: Path content is required.
```

## Tracing evidence

Jaeger was not used. The mongoose schema rejected the write before the post was stored.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

`CreatePostBox` already allows media-only posts (`content.trim()` or pending media). It sends `content: ""`.

`CommunityPost` marked `content` as `required: true`. Mongoose treats an empty string as missing, so gallery posts without a caption never saved.

**Related files:**
- [community-post.model.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.model.ts)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [create-post-box.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/create-post-box.tsx)

## Fix applied

- `content` is optional on the schema and defaults to an empty string.
- `createPost` accepts a caption or at least one media id, and rejects a completely empty post.
- GraphQL `Input_CreateCommunityPost.content` is optional.

## Unit / Regression test

- **Test File:** [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community-post.controller.test.ts`
- **Test Results:** Gallery post with media and no caption is created. A post with neither text nor media is rejected. 17 tests passed.

## Lessons learned

Required string fields reject empty captions. Media-only posts need an explicit empty default and a body check that treats media as enough.

## References

- Related bug cases: BUG-068
