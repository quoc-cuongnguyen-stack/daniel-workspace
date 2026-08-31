# BUG-002: Map Pin Badge Persists After Announcement Deletion

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-20
> **Date Fixed:** 2026-07-20
> **Project:** SSL
> **Severity:** 🟠 High
> **Superthread Tasks:** #858, #862

---

## 🔍 Description

When a user removes (soft-deletes) an announcement, the map pin badge (`hasUpcomingEvent` icon) remained visible on their profile pin, and the event pin itself stayed on the map until page refresh.

## 🔄 Root Cause & Fix Breakdown

### 1. `hasUpcomingEvent` calculation ignored `isDel` in `updateEvent`
- **Root Cause**: In [event.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/event/event.controller.ts), `updateEvent` only checked `isActive` and `endDate` when computing `before` and `after` states for `hasUpcomingEvent`. When `{ isDel: true }` was passed, `isActive` remained `true`, so `hasUpcomingEvent` was never updated.
- **Fix**: Factored `isDel !== true` into `before` and `after` state conditions.

### 2. `MongooseController.aggregate` wrapper return type bug
- **Root Cause**: In `updateEvent` and `deleteEvent`, `mongooseCtr.aggregate` returns `{ success: true, result: [...] }`. Code used `Array.isArray(agg)` on the wrapper object which evaluated to `false`, incorrectly clearing `hasUpcomingEvent` even when remaining active events existed.
- **Fix**: Extracted `aggRes.result` array before checking length: `const docs = aggRes.success && Array.isArray(aggRes.result) ? aggRes.result : [];`.

### 3. Event Location soft-delete by `entityId` & `locationId`
- **Root Cause**: `updateEvent` soft-delete previously attempted `locationCtr.updateLocation` by `locationId`. If `locationId` was not set on the event document, the Location document stayed `isDel: false`.
- **Fix**: Updated `updateEvent` to run `LocationModel.updateMany({ $or: [{ entityType: EVENT, entityId }, { id: locationId }] }, { $set: { isDel: true } })`.

### 4. Viewport query filters missing `isDel: { $ne: true }`
- **Root Cause**: In [location.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/location/location/location.controller.ts), `getDashboardEventsInViewport` did not filter `isDel: { $ne: true }` in `baseFilter`. Soft-deleted locations were returned to map clients until page refresh.
- **Fix**: Added `isDel: { $ne: true }` to `baseFilter` in `location.controller.ts`.

### 5. Redis & Apollo Cache Invalidation
- **Fix**: Added Redis `bumpVersion('user')` & `bumpVersion('location')` in backend event operations, and added viewport map query names to `refetchQueries` in [event.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/event/event.hook.ts).

### 6. Expired / Soft-Deleted Event Delete Error ("Event not found.")
- **Root Cause**: In [event.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/event/event.controller.ts), `getEvent` defaulted `isDel: { $ne: true }` and appended `{ endDate: { $gt: now } }` for any query without explicit `isDel` or expiry overrides. When deleting or permanently removing an expired/soft-deleted event by ID, `getEvent` rejected the query, throwing `"Event not found."`.
- **Fix**: Updated `getEvent` to skip both `isDel: { $ne: true }` and `endDate > now` filters when querying specifically by `id` or `_id`.

---

## 📝 Verification Result

Tested against active user `daniel123`:
- Event `b2211297...` ("Event announcementEvent a") soft-deleted → Location `06132855...` set to `isDel: true` immediately.
- Active event `bf42461c...` ("Travel announcementTravel") remains active → User `hasUpcomingEvent` remains `true` (correct).
- Event pin removed from map instantly without requiring page reload.
