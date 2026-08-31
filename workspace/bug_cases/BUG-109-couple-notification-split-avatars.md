# BUG-109: Couple notification avatars showed only one partner

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-23
> **Date Fixed:** 2026-08-23
> **Project:** SSL (ssl-be, ssl-fe-user)
> **Severity:** 🟡 Medium

---

## Description

Couple accounts should show both partner photos on notification rows (and on comment avatars). After BUG-108 forced partner1-only, the Notifications popup for Secretswingerlust showed a single 48x48 square.

## Reproduction Steps

1. As a couple account with both partner photos, comment on someone else's post.
2. As the post owner, open Notifications.

**Expected behavior:** The actor avatar splits partner1 on the left and partner2 on the right.
**Actual behavior:** One full square of partner1 only.

## Evidence

Live browser 2026-08-23 on `http://localhost:8001` as danielrich. Secretswingerlust is `COUPLE`; partner1 `...2209875.jpeg`, partner2 `...2210833.jpeg`. The bell row had one `img` (`alt="Avatar"`, 48x48).

## Tracing Evidence

Jaeger was unavailable (`localhost:16686` down). Presentation logic on notification list plus comment avatars.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No PostHog session or error link was provided.

## Root Cause Analysis

`T_NotificationPresentationActor` only had `avatarUrl`. Listing signed a single gallery URL. The frontend `getNotificationAvatarSlots` always returned one slot, and the popup rendered one 48x48 image.

BUG-108 then locked comment notifications to partner1-only, which is the opposite of couple-split.

**Related files:**
- [notification.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.util.ts)
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)
- [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx)

## Fix Applied

Added `avatarUrl2` on the actor, listing signs both live partner galleries for `COUPLE`, and the popup uses a two-column split. Comment threads again split both partners.

## Unit / Regression Test

- **Test File:** [notification.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.util.test.ts)
- **Test File:** [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Test File:** [notification.utils.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` then `pnpm --prefix ssl-fe-user test:unit` then `test:e2e`

## Lessons Learned

Couple actors need two URLs on the wire. A single `avatarUrl` cannot split both partners in the popup.

## References

- Related bug cases: BUG-105, BUG-108
- Knowledge items: not written; app data directory is unknown
