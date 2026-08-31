# BUG-026: Free Profile Visit Unread Counter Persisting Permanently

## Issue Summary
Free profile users (`isFreeMember` / `!isPaidMember`) saw the unread profile visit counter (eye icon badge) persist permanently because visitor profiles are masked (`username === 'Member'`, `locked = true`). Clicking a row returns early before invoking `markProfileVisitRead`, so visits remained `readAt: null` indefinitely.

## Root Cause
1. **Frontend (`visitor-list.tsx`)**: In `handleOpen`, locked/masked visitor rows return early (`if (!username || isMaskedVisitor) return`), skipping `markRead(id)`. Free users had no interaction path to mark unread visits as read.
2. **Backend (`profile-visit.controller.ts`)**: `getProfileVisits` returned teaser visitor profiles but did not update `readAt` on the database when free users loaded their visitor list.

## Resolution
1. **Backend (`ssl-be/src/modules/profile-visit/profile-visit.controller.ts`)**: In `getProfileVisits`, when `!isPaid` is true, automatically update `readAt = now` on MongoDB for unread visits returned to free users.
2. **Frontend (`ssl-fe-user/src/modules/visitor/visitor-list.tsx`)**: Added `useMarkAllProfileVisitsRead` hook and a `useEffect` trigger in `VisitorList` that auto-marks unread visits as read and dispatches `notifyProfileVisitCounterChanged()` when a free member opens/views the profile visits drawer/page.
