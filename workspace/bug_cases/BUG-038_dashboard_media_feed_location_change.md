# BUG-038: Dashboard media feed location change scoping, gallery limit truncation, and blank grid placeholders (C-913)

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-04
> **Date Fixed:** 2026-08-04
> **Project:** SSL (Backend & Frontend)
> **Severity:** 🟠 High

---

## 🔍 Description

The Dashboard media feed did not accurately display photo and video media from all active users in the target location following a location change. Furthermore, when locations had fewer than 7 photos or 6 videos available, the frontend grid layouts rendered empty black placeholder boxes.

## 🔄 Reproduction Steps

1. Select or change location on the Dashboard map (e.g. view a city with 2-3 uploaded media items or users with temporary locations).
2. Observe the Photo and Video feed sections below the map.
3. Note that media items from users whose current active location was in that city were omitted or mismatched with historical/expired location records.
4. Observe black empty placeholder blocks filling the grid where photos/videos were missing.

**Expected behavior:** Media feed shows latest photos and videos from users whose current active location is in the target viewport, and grid layouts render cleanly without empty black gaps.
**Actual behavior:** Media feed included stale/expired location users, truncated result count below requested limit due to post-filtering, and left empty black placeholder gaps in grid layouts.

## 📸 Evidence

```text
Backend: getDashboardGalleriesInViewport used raw locationMongooseCtr.distinct('entityId', locationFilter) which returned user IDs from stale/expired location records.
Backend: getGalleries post-filtered 7 fetched candidate docs down to 2-3 items without over-fetching.
Frontend: GalleryPhoto (5-column, 6-row grid) and GalleryVideo (4-column, 2-row grid) hardcoded fixed grid cell placements for 7 photos / 6 videos, leaving empty grid slots as black boxes when items < 7 or < 6.
```

## 🔭 Tracing Evidence

**Jaeger Operations Inspected:**
- `ssl-be-local`: `getDashboardGalleriesInViewport` -> `locationCtr.getDashboardProfilesInViewport` -> `getGalleriesByUserIds`

**Key Observations:**
- Tracing confirmed `locationCtr.getDashboardProfilesInViewport` resolves candidate user locations and evaluates `isMapTemporaryLocationActive` to return only users currently residing/temporarily active in the target viewport coordinates.

## 📊 PostHog Evidence

**Error Tracking & Event Data:**
- Verified no unhandled GraphQL runtime exceptions; issue was logical scoping and fixed CSS grid layout bounds.

## 🧠 Root Cause Analysis

1. **Active Location Scoping**: `getDashboardGalleriesInViewport` performed a raw `distinct('entityId')` on the `locations` collection. It did not evaluate whether a location document was the user's current active location (`isMapTemporaryLocationActive` / `applyMapViewportPolicy`), causing users with expired temporary locations or home locations elsewhere to be incorrectly matched.
2. **Limit Fulfillment Post-Filtering**: `getDashboardGalleriesInViewport` queried only `limit` (7/6) raw gallery docs from MongoDB before applying post-query filters (incomplete users, deleted accounts, unverified status). Post-filtering dropped the doc count below `limit` even when more approved galleries existed for those viewport users.
3. **Fixed Grid Cell Placeholders**: `GalleryPhoto` and `GalleryVideo` applied fixed cell positions (`gridClasses[index]`) designed strictly for 7 items (photos) or 6 items (videos). When fewer items were returned, unassigned grid cells rendered as blank black placeholders.

**Related files:**
- [gallery.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/gallery/gallery.controller.ts)
- [gallery-viewport.controller.spec.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/gallery/gallery-viewport.controller.spec.ts)
- [gallery-photo.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/gallery/gallery-photo.tsx)
- [gallery-video.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/gallery/gallery-video.tsx)

## 🔧 Fix Applied

1. Updated `getDashboardGalleriesInViewport` in `gallery.controller.ts` to resolve viewport users via `locationCtr.getDashboardProfilesInViewport`, aligning media feed scoping with active user location policy (`isMapTemporaryLocationActive`).
2. Configured candidate over-fetching (`candidateLimit = limit > 0 ? Math.max(limit * 3, 50) : 50`) in `getDashboardGalleriesInViewport` so post-filtering satisfies the requested `limit`.
3. Created dynamic grid layout helpers `getPhotoGridClass(index, total)` and `getVideoGridClass(index, total)` in `gallery-photo.tsx` and `gallery-video.tsx` to dynamically adapt grid positioning for item counts from 1 to 7/6 without empty black gaps.

```diff
- const viewportUserIdsResult = await locationMongooseCtr.distinct('entityId', locationFilter);
+ const profilesResult = await locationCtr.getDashboardProfilesInViewport(context, {
+     filter: { southWestLatitude, southWestLongitude, northEastLatitude, northEastLongitude },
+     options: { pagination: false, limit: 500 },
+ });
```

## 🧪 Unit / Regression Test

- **Test File:** [gallery-viewport.controller.spec.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/gallery/gallery-viewport.controller.spec.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/gallery/gallery-viewport.controller.spec.ts`
- **Test Results:** 3 tests passed (verified parameter validation, empty viewport handling, active user resolution, candidate over-fetch limit fulfillment).

## 📝 Lessons Learned

- Always use the centralized location policy (`applyMapViewportPolicy` / `isMapTemporaryLocationActive`) when filtering users by viewport to ensure temporary locations and home location fallbacks are respected consistently across all dashboard widgets.
- When applying post-query filters in memory after a database find, always over-fetch candidates or page until the target limit is fulfilled.
- Grid layouts in media components should dynamically adjust position classes based on actual item count rather than assuming fixed maximum slot counts.

## 🔗 References

- Related bug cases: [BUG-023](bug_cases/BUG-023_temporary-location-double-pin-mismatch.md)
