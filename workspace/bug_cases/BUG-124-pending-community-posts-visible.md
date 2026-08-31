# BUG-124: Pending community posts visible to other members

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-28
> **Date Fixed:** 2026-08-28
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

With `Admin approval required to post` enabled, MEMBER posts are created as `PENDING`, but other community members could still learn about / treat them as live content (notably via `notifyNewPost` firing on create for every member). Feed/gallery visibility is now centralized so unrelated members only see `ACTIVE` posts (plus their own `PENDING`), while mods/admins see pending for review.

## 🔄 Reproduction Steps

1. Enable admin approval on a community.
2. As a paid MEMBER, create a post (status PENDING).
3. As another MEMBER, open the community feed / receive notifications.

**Expected behavior:** Only the author and community mods/admins see the pending post until it is approved.
**Actual behavior:** Other accounts were notified / could observe the pending post as if it were live.

## ✅ Fix

- `buildCommunityPostVisibilityFilter` in `community.policy.ts` (used by feed + gallery) so unrelated members only see ACTIVE (+ own PENDING).
- Initially deferred `notifyNewPost` to approve for all members; **superseded by BUG-125** — admins/mods must be notified on PENDING submit, not on approve.
- Regression tests for author / mod / unrelated member filters and post-approval ACTIVE transition.

## Related

- [BUG-125](BUG-125-pending-post-admin-notification-timing.md) — correct admin/mod notification timing for PENDING posts.

## 📁 Files Changed

- `ssl-be/src/modules/community/community.policy.ts`
- `ssl-be/src/modules/community/community-post.controller.ts`
- `ssl-be/src/modules/community/community-post.controller.test.ts`
- `ssl-be/src/modules/community/community.policy.test.ts`
