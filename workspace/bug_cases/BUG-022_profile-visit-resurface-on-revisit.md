# BUG-022: Profile visit counter and UI list not recording/displaying re-visit after deletion

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-29
> **Date Fixed:** 2026-07-29
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When a host user deletes a visitor's profile view record from their profile eye icon drawer, subsequent visits by the same visitor failed to display on the UI list or increment the eye icon unread counter.

## 🔄 Reproduction Steps

1. User B views User A's profile page. User A sees User B in the profile visit drawer.
2. User A opens the eye icon drawer and deletes User B's visit record (`deleteProfileVisit` sets `isDel: true`).
3. User B views User A's profile page again (`recordProfileVisit` executes).
4. User A opens the eye icon drawer again.
5. **Expected behavior:** User A's eye icon counter increments (+1 count) and User B appears in the list.
6. **Actual behavior:** The drawer UI displayed "No profile visits yet" and omitted the re-visiting user because local component state `removedVisitIds` permanently hid the server-restored visit record.

## 🩸 Root Cause

1. **Frontend (`ssl-fe-user/src/modules/visitor/visitor-list.tsx`)**:
   `VisitorList` is rendered inside `Header` (`header.tsx`) via a persistent `<Modal>` that remains mounted during the user session. When a host deleted a visit row, `handleDelete` added the visit ID to `removedVisitIds` (`Set<string>`) for optimistic removal. Because `VisitorList` never unmounts, `removedVisitIds` retained the deleted visit ID indefinitely. When Apollo refetched `GetProfileVisitsDocument` returning the server-restored visit record (`isDel: false, readAt: null`), `visits.filter(v => !removedVisitIds.has(v.id))` permanently filtered out the restored visit from the UI list.

2. **Backend (`ssl-be/src/modules/profile-visit/profile-visit.controller.ts`)**:
   `recordProfileVisit` conditionally reset `{ isDel: false, readAt: null }` ONLY if `wasDeleted` was `true`. If the host had read the visit previously, `readAt` was not reset to `null` on re-visit, leaving `readAt` set to a Date timestamp and causing `getProfileVisitCounter` to ignore the re-visit.

## 🛠️ Resolution

1. **Frontend (`visitor-list.tsx`)**: Added `useEffect` to clear `removedVisitIds` (`setRemovedVisitIds(new Set())`) whenever `data?.result?.docs` updates from server refetches.
2. **Backend (`profile-visit.controller.ts`)**: Unconditionally reset `isDel: false` and `readAt: null` on every `recordProfileVisit` update.
3. **Unit Tests**: Added tests in `profile-visit.controller.test.ts` (4/4 PASS).
