# BUG-108: Gallery post comment notifications showed partner2 avatars

> **Status:** ⚠️ Superseded by BUG-109
> **Date Found:** 2026-08-23
> **Date Fixed:** 2026-08-23
> **Project:** SSL (ssl-be, ssl-fe-user)
> **Severity:** 🟡 Medium

---

## Description

Comment notifications for gallery posts should show only the commenting couple's `partner1` photo. The first pass restricted listing/create `avatarUrl` to partner1, but a couple commenter still rendered both partners on the gallery comment thread (`CardProfile` / `MessageItem` / community gallery-post comments). Listing also restored a stored partner2 URL when live partner1 was missing.

## Reproduction Steps

1. As a couple account with both partner photos, comment on someone else's gallery post (profile photo lightbox or a community post with images).
2. As the post owner, open Notifications, then open the comment thread.

**Expected behavior:** The notification row and the gallery comment avatar show a single `partner1.gallery` photo.
**Actual behavior:** The bell used partner1, but the gallery comment UI still split partner1 and partner2. Listing could also fall back to a stored partner2 URL.

## Evidence

Live browser 2026-08-23 on `http://localhost:8001` as danielrich:

- Secretswingerlust is `COUPLE`; partner1 female `...2209875.jpeg`, partner2 male `...2210833.jpeg`.
- Notifications popup: one 48x48 img of partner1, copy "Secretswingerlust commented on your post."
- Community feed comments and `CardProfile` gallery comments still used the couple split (`grid-cols-2` / second `Image` at `w-1/2`).

## Tracing Evidence

Jaeger was unavailable (`localhost:16686` down). This is presentation logic on notification list plus comment avatars.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No PostHog session or error link was provided.

## Root Cause Analysis

Two leftover paths after the first listing fix:

1. `pickNotificationActorAvatarUrl` still did `actorGalleryUrl ?? storedAvatarUrl`. For partner1-only types a null live partner1 restored the stored (often partner2) URL.
2. Gallery comment UI did not share that rule. `CommentSection` always rendered `CardProfile` with the couple split. `MessageItem` did the same for `GALLERY_COMMENT`. Community posts with `mediaIds` used `CommunityUserAvatar` couple slots from BUG-105.

**Related files:**
- [notification.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.util.ts)
- [card-profile.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/card/card-profile.tsx)
- [comment-section.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/comment-section.tsx)
- [mess-item.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/component/mess-item.tsx)
- [community-user-avatar.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-user-avatar.util.ts)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)

## Fix Applied

Partner1-only listing no longer reads stored avatar URLs. Gallery `GALLERY_COMMENT` threads (`CardProfile`, `MessageItem`) and community posts with media use a single partner1 slot. Text-feed comments still split both partners (BUG-105).

## Unit / Regression Test

- **Test File:** [notification.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.util.test.ts)
- **Test File:** [community-user-avatar.util.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-user-avatar.util.test.unit.ts)
- **Test File:** [community-user-avatar.util.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-user-avatar.util.test.e2e.ts)
- **Test File:** [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Test File:** [notification.utils.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` then `pnpm --prefix ssl-fe-user test:unit` then `test:e2e`
- **Test Results:** ssl-be unit 195 passed. ssl-fe-user unit 158 passed. ssl-fe-user e2e 15 passed. Gallery comments ignore stored partner2. Couple gallery-post comments return one partner1 slot.

## Lessons Learned

A notification `avatarUrl` of partner1 does not stop couple-split comment components from rendering partner2 next to it. Gallery comment surfaces need the same partner1-only flag.

## References

- Related bug cases: BUG-105, BUG-107
- Knowledge items: not written; app data directory is unknown
