# BUG-113: Community comment submit with media has no loading spinner

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

Submitting a community post comment with attached media left the Comment button looking idle. Upload plus mutation can take several seconds, so users clicked again and sent duplicate comments.

## Reproduction Steps

1. Open a community feed post and expand comments.
2. Attach a photo (and optional text) and click Comment.
3. Watch the submit button while the file uploads.

**Expected behavior:** The button shows a spinner, stays disabled, and ignores extra clicks until upload and create finish (success or error). Then it returns to the normal Comment label.
**Actual behavior:** The button kept the Comment label. `disabled` only applied after React re-rendered `isUploadingCommentMedia`, so a second click or Enter could start another submit.

## Evidence

Feed and lightbox composers used a raw `<button>` with the Comment label always visible. Create Post already uses shared `Button` `loading={isLoading || isUploading}`.

## Tracing Evidence

Frontend UI state. Jaeger was not required.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching exception: the submit path succeeded, it just gave no in-button progress.

## Root Cause Analysis

`isUploadingCommentMedia` already covered upload then `createComment`, and `finally` cleared it. The submit control never passed that flag into a loading spinner. Duplicate submits raced the React state update: both clicks saw `isUploadingCommentMedia === false` before the first `setState` flushed.

**Related files:**
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [button.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/button.tsx)

## Fix Applied

`getCommunityCommentSubmitState` marks the control busy for upload or mutation. Shared `Button` `loading` shows the spinner and sets `aria-busy`. `acquireCommunityCommentSubmitLock` blocks a second click/Enter before re-render. `finally` clears the flag and the lock on success and failure.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Busy during upload even before the mutation; `canSubmit` false while busy; restored after success and failure; second lock acquire fails until release.

## Lessons Learned

A disabled flag that is set asynchronously is not a submit lock. Pair in-button loading with a synchronous ref, and reuse the Button spinner instead of a second custom control.

## References

- Related bug cases: BUG-110, BUG-111, BUG-112
- Create Post already used `Button` `loading={isLoading || isUploading}`
