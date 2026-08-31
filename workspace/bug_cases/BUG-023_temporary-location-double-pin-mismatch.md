# BUG-023: Temporary location set/expired causes double map pins & profile header location mismatch

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-29
> **Date Fixed:** 2026-07-29
> **Project:** SSL (Frontend)
> **Severity:** 🟠 High

---

## 🔍 Description

When a user set a temporary location or when the temporary location expired, two pins appeared on the map for the user (e.g. France and Denmark). In addition, on the profile header page, the header text and flag icon showed the primary location (Denmark) while the embedded map below it showed the temporary location (France).

## 🔄 Reproduction Steps

1. Set a temporary location (e.g. France) for a profile whose primary location is Denmark.
2. View the Social Map or Profile page.
3. Observe two pins rendered on the Social Map (one DOM marker and one GeoJSON marker).
4. Observe profile header text displaying "Denmark, Copenhagen" while the embedded map renders a pin in France.
5. Allow the temporary location to expire and note stale location retention.

**Expected behavior:** Single map pin representing active location, header text matching active location, and clean fallback to primary location on expiry.
**Actual behavior:** Two pins rendered on map and header text mismatching embedded map pin.

## 🩺 Root Cause Analysis

1. `useCurrentLocation()` did not set `entityId: targetUser?.id` on returned `currentLocation` objects.
2. `MapTilerViewer` filter `loc.entityId === currentLocation.entityId` failed because `currentLocation.entityId` was `undefined`, resulting in failure to deduplicate the user's DOM marker and GeoJSON viewport pin.
3. `useCurrentLocation()` fallback retained expired temporary location data in `lastValidRef` when `isTemporaryLocationValid` turned false.
4. `profile-header.tsx` hardcoded `user?.partner1?.location` for header text and country flag instead of deriving location from `currentLocation`.

## 🛠️ Resolution

1. Attached `entityId: targetUser?.id` to location objects in `use-current-location.ts` and cleared `lastValidRef` when temporary location expires.
2. Enhanced current user pin filter in `maptiler-viewer.tsx` to match `currentUserId` via `entityId` or `entity.id`.
3. Updated `profile-header.tsx` to derive header text and country flag from `currentLocation`.
4. Added unit test suite `use-current-location.test.unit.ts`.
