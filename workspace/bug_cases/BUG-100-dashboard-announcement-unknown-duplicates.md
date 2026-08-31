# BUG-100: Dashboard Announcements card shows Unknown and repeats a club visit

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

On production, the dashboard Announcements card showed the Levemanden club-visit announcement three times. The title/type rendered as "Unknown" instead of "Going clubbing Tucan Club". Other announcement types on the same card looked normal. The profile page for the same announcement showed the correct title.

## Reproduction Steps

1. Open the production dashboard while a club-visit announcement is in the current map viewport.
2. Look at the Announcements carousel.

**Expected behavior:** Each announcement appears once with its localized title.
**Actual behavior:** The club visit is repeated and the title falls back to "Unknown".

## Evidence

Production dashboard snapshots for user Levemanden, 21 August 2026, description "Fun times. I am visiting the club i will be there for 2 days". Profile modal showed "Going clubbing Tucan Club".

## Tracing Evidence

Jaeger was not running locally. This is a production display bug in the dashboard viewport query and Apollo cache identity, not a failing backend request.

## PostHog Evidence

No Superthread PostHog link was attached. The dashboard and profile pages were compared from local production snapshots.

## Root Cause Analysis

Club visits reuse the destination location document so the club pin is not duplicated. `getDashboardEventsInViewport` then wrapped each matching event with `id: sourceLocation.id`. Several club visits at the same club therefore shared one Apollo `T_Location` cache key, and the docs array repeated the same cached entity.

Club-visit titles are stored as `{ en: "Going clubbing Tucan Club" }`. The dashboard viewport path did not call `localizeDocument`, and `CardAnnouncement` only accepted string titles, so the compact card fell through to the "Unknown" fallback.

**Related files:**
- [location.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/location/location/location.controller.ts)
- [location.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/location/location/location.hook.ts)
- [card-announcement.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/card/card-announcement.tsx)
- [card-announcement.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/card/card-announcement.util.ts)

## Fix Applied

Backend viewport docs now use `${locationId}-event-${eventId}` and drop repeated event ids. Hydration localizes the event before the card reads `title`. The frontend resolves JSON titles and dedupes viewport docs by event id.

```diff
- id: sourceLocation.id ?? `${event.locationId ?? event.id}-event-${event.id}`
+ id: `${sourceLocation.id}-event-${event.id}`
```

## Unit / Regression Test

- **Test File:** [location.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/location/location/location.controller.test.ts)
- **Command:** `pnpm --prefix ssl-be test:unit`
- **Test Results:** Unique wrapper ids for two club visits that share a destination; repeated event ids collapse to one card; localized club-visit titles do not fall back to "Unknown".

## Lessons Learned

Viewport wrappers must stay unique per entity even when they reuse a physical location. JSON localized titles must be resolved on every read path, not only `presentAnnouncement`.

## References

- Related bug cases: BUG-100
