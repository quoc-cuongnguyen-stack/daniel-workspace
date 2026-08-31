# BUG-110: Community post comments with text and media show only the text

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

On a community post, attaching a photo (Photo button) and typing comment text, then submitting, stored both on the server but the comment list showed only the text. The attached image was missing. Superthread C-994.

## Reproduction Steps

1. Open a community feed post and expand Post Comments.
2. Click Photo, attach an image, type text (for example `image`), and click Comment.
3. Look at the new comment in the list.

**Expected behavior:** The comment shows the text and the attached image.
**Actual behavior:** Only the text is shown. The image is gone.

## Evidence

`F_CommunityComment` selected `id`, `createdAt`, `author`, and `content` only. The comment bubble rendered `{comment.content}` and never a media grid.

## Tracing Evidence

Frontend rendering bug. Jaeger was not running locally. No backend error span: `createComment` already persisted `mediaIds`.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching error-tracking issues in the last 14 days for this symptom.

**Error Tracking Issue:** [project error tracking](https://eu.posthog.com/project/108852/error_tracking)

## Root Cause Analysis

Two client gaps, same symptom:

1. `F_CommunityComment` did not request `mediaIds`, so create/list responses never returned attachments.
2. The comment list rendered text only. Post tiles already resolved `mediaIds` via `GetCommunityMedia`; comments did not.

**Related files:**
- [communities-post.fragment.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities-post.fragment.graphql)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)

## Fix Applied

- Select `mediaIds` on `F_CommunityComment`.
- Render comment attachments with the same media tiles as posts.
- Overlay just-uploaded URLs so the new comment shows media immediately.
- Fetch comment media ids through `useCommunityMediaById` when comments are open.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` and `pnpm --prefix ssl-be test:unit`
- **Test Results:** Mixed text+media comments keep both `content` and `mediaIds`. Backend `createComment` persists both.

## Lessons Learned

A field that the mutation accepts is not visible unless the fragment selects it and the UI renders it. Post media already had this path; comments did not reuse it.

## References

- Superthread: [C-994](https://app.superthread.com/cnlgaming/card-994-bug-uploaded-image-does-not-display-in-comment-after-submission)
- Knowledge item: [community-comment-text-media-missing](file:///Users/daniel/.gemini/antigravity-ide/knowledge/community-comment-text-media-missing/artifacts/bug_analysis.md)

