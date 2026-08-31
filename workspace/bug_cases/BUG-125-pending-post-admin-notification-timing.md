# BUG-125: Pending community posts did not notify admins/mods in real time

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-29
> **Date Fixed:** 2026-08-29
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

With admin-approval posting enabled, MEMBER posts are created as `PENDING`, but community ADMIN/MODERATOR accounts did not receive a real-time `COMMUNITY_NEW_POST` notification on submit. Notification only appeared when a moderator approved the post (and then looked like a brand-new create).

Root cause: BUG-124 deferred `notifyNewPost` to approve and skipped it for PENDING create. Product requirement is the opposite for staff: notify elevated roles once on submit.

## 🔄 Reproduction Steps

1. Enable "Admin approval required to post" on a community.
2. As a paid MEMBER (Allan), create a post → status `PENDING`.
3. As community ADMIN/MOD with an open NotificationAdded WS subscription, watch the bell.

**Expected behavior:** ADMIN/MOD (except the author) get one in-app notification immediately on submit, deep-linked to `/communities/{slug}/moderator?postId=...`. Approve does not create another notification.

**Actual behavior:** No notification on submit; approving the post fired `Allan has created a new post in ...`.

## ✅ Fix

- `createPost`: call `notifyNewPost` for both `PENDING` and `ACTIVE` (with `postStatus`).
- `approveCommunityPost`: do **not** call `notifyNewPost` (only live feed WS update).
- `notifyNewPost`: recipients = unmuted ADMIN/MODERATOR only, exclude author; also include `community.createdById` when missing a member row (same fallback as applications); PENDING deep-link → moderator queue, ACTIVE → feed.
- `createNotification` still publishes `NOTIFICATION_ADDED` for FE `NotificationAdded` subscription.

## 📁 Files Changed

- `ssl-be/src/modules/community/community-post.controller.ts`
- `ssl-be/src/modules/community/community-notification.service.ts`
- `ssl-be/src/modules/community/community-post.controller.test.ts`
- `ssl-be/src/modules/community/community-notification.service.test.ts`
- `ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts` (deep-link coverage)

## Related

- Knowledge item: [pending-post-admin-notification-timing](file:///Users/daniel/.gemini/antigravity-ide/knowledge/pending-post-admin-notification-timing/)
