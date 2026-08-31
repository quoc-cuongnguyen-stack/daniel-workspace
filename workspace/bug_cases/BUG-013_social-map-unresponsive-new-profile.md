# BUG-013: Social Map Unresponsive / Infinite Spinner Loading for New Profiles

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-22
> **Date Fixed:** 2026-07-22
> **Project:** ssl-fe-user
> **Severity:** 🔴 Critical

---

## 🔍 Description

When a newly registered user (or user with no saved location coordinates) opens the Social Map dashboard, the map becomes completely unresponsive and gets stuck in an infinite loading spinner overlay (`dashboard.map-loading`).

## 🔄 Reproduction Steps

1. Create a new user profile or log in with an account that has no location coordinates saved in `user.settings.temporaryLocation` or `user.partner1.location`.
2. Navigate to the Social Map page (`/home` or dashboard map).
3. Observe the map interface.

**Expected behavior:** The map displays a default fallback center (e.g. Europe coordinates) and loads user pins gracefully.
**Actual behavior:** The map remains locked in the full-screen red loading spinner indefinitely because `waitForCurrentLocation` waits for `currentLocation` coordinates that never resolve.

## 📸 Evidence

```
isWaitingForLocation = waitForCurrentLocation && !initialCenter && !currentLocation?.map?.latitude && !currentLocation?.map?.longitude
--> Evaluates to TRUE permanently when currentLocation is empty
```

## 🧠 Root Cause Analysis

In [maptiler-viewer.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/map/maptiler-viewer.tsx#L1584-L1588), `isWaitingForLocation` evaluated synchronously:
```typescript
const isWaitingForLocation = waitForCurrentLocation && !initialCenter && !currentLocation?.map?.latitude && !currentLocation?.map?.longitude;
```
For new profiles without saved GPS coordinates, `currentLocation?.map?.latitude` is `undefined`. Because `waitForCurrentLocation` was set to `true`, `isWaitingForLocation` remained `true` indefinitely without any timeout or fallback mechanism, completely preventing the MapTiler DOM container from rendering.

Additionally, `mapCenter` in MapTiler map creation fell back to `undefined` instead of `DEFAULT_EUROPE_COORDINATES`, and event handlers `moveend` and initial viewport timers returned early when `!hasCurrentLocationCoordinates()`, preventing query bounds commitment and pin fetching.

**Related files:**
- [maptiler-viewer.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/map/maptiler-viewer.tsx)

## 🔧 Fix Applied

1. Added `isLocationWaitTimedOut` state in `MapTilerViewer` with a **3-second timeout fallback** when `waitForCurrentLocation` is set and coordinates are missing.
2. Updated `isWaitingForLocation` to check `!isLocationWaitTimedOut`, bypassing the full-screen spinner after 3 seconds.
3. Updated `mapCenter` to fall back to `DEFAULT_EUROPE_COORDINATES` when `currentLocation` is missing.
4. Updated `moveend` and initial viewport settlement timers to check `!isLocationWaitTimedOut` so that query bounds and viewport settlement are committed gracefully using default map bounds when location is unavailable.

## 🧪 Unit / Regression Test

- Verified clean ESLint check (`pnpm eslint src/shared/component/map/maptiler-viewer.tsx --fix`).
- Verified fallback logic handles `currentLocation = undefined` cleanly without infinite spinner loops.

## 📝 Lessons Learned

- Always include a finite timeout fallback when waiting for asynchronous browser geolocation or user profile location data before rendering critical UI maps.
