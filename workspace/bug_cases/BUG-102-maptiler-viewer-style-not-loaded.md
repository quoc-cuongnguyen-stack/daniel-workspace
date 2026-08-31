# BUG-102: Dashboard map Style is not done loading

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

The dashboard map threw an unhandled rejection when GeoJSON pin sources were added: `Error: Style is not done loading` at `MapTilerViewer` `addSource('pins-source')`.

## Reproduction Steps

1. Open the dashboard map after the C-946 camera restore wiring.
2. Wait for the map `load` handler to start loading pin images.
3. Let `onCameraChange` write the live camera back into the dashboard store (or wait for the 3s location timeout).
4. Observe the viewer remount while the previous `loadPinImages` promise is still pending.

**Expected behavior:** Pin sources are added only on the live map after its style is ready. Recording the camera must not recreate the map.
**Actual behavior:** The init effect remounts, the stale promise calls `addSource` on a new map whose style is not loaded, and Next.js reports `unhandledRejection`.

## Evidence

```
unhandledRejection: Error: Style is not done loading.
    at MapTilerViewer.useEffect (src/shared/component/map/maptiler-viewer.tsx:1256:36)
mapRef.current.addSource('pins-source', {
```

## Tracing Evidence

Jaeger is not applicable. This is a frontend MapTiler/MapLibre style race with no backend span.

## PostHog Evidence

`query-error-tracking-issues-list` for "Style is not done loading" over the last 7 days returned no matching issues. Error tracking may not be ingesting this local Next.js unhandled rejection yet.

**Error Tracking Issue:** [project error tracking](https://eu.posthog.com/project/108852/error_tracking)

## Root Cause Analysis

Dashboard now passes a live `initialCenter` from `resolveDashboardMapInitialCamera({ restoredCamera, currentUserMapCenter })`. Viewer `load` emits the camera, the store updates, `initialCenter` changes, and the map init `useEffect` depends on `initialCenter` and `isLocationWaitTimedOut`. That tears down the first map and creates a second one.

`loadPinImages` is async. The old callback only checked `if (!mapRef.current) return`, so a remounted map still passed. `addSource` then ran against a style that had not finished loading.

**Related files:**
- [maptiler-viewer.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/map/maptiler-viewer.tsx)
- [maptiler-viewer.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/map/maptiler-viewer.util.ts)
- [dashboard.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/dashboard/dashboard.page.tsx)
- [dashboard-map-camera.session.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/dashboard/dashboard-map-camera.session.ts)

## Fix Applied

Treat `initialCenter` / `initialZoom` as mount-only. Snapshot the dashboard session camera on first render. Guard pin-source setup with instance identity plus `isStyleLoaded()` / `idle`. Jump to the user pin when location arrives instead of remounting the map.

## Unit / Regression Test

- **Test File:** [maptiler-viewer.util.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/map/maptiler-viewer.util.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit`
- **Test Results:** Stale remount + unloaded style skip `addSource`. Same-instance ready style applies sources. First dashboard session camera stays after later pans.

## Lessons Learned

Async MapLibre setup must capture the created map instance and refuse to mutate a replacement. Camera persistence must not feed live recorded values back into map constructor props.

## References

- Related bug cases: BUG-102
- C-946 dashboard camera restore
- Knowledge item: [Dashboard map Style is not done loading](file:///Users/daniel/.gemini/antigravity-ide/knowledge/maptiler-viewer-style-not-loaded/artifacts/bug_analysis.md)
