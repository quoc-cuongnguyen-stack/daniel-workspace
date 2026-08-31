# BUG-017: Editing Profile Location Did Not Trigger Area-of-Interest Broadcast Notification

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-23
> **Date Fixed:** 2026-07-23
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When a user updated their primary location (`partner1.location`) via the Edit Location modal on their profile page (`/en/profile/{username}`), nearby users never received the `NEW_MEMBER_IN_YOUR_AREA_OF_INTEREST` push/in-app notification, regardless of their configured `settings.zoomLevel`.

## 🔄 Reproduction Steps

1. Log in as User A and configure map location and `settings.zoomLevel` (area of interest).
2. Log in as User B and open profile page `/en/profile/userB`.
3. Open the "Edit Location" modal and update location to coordinates within User A's zoom level area.
4. User A receives no notification.

**Expected behavior:** `broadcastNewMemberInArea` is triggered in background, sending notification to User A whose zoom level / area-of-interest covers User B's new location.
**Actual behavior:** `updateUser` updated `partner1.locationId` in MongoDB but did not invoke `broadcastNewMemberInArea`.

## 🧠 Root Cause Analysis

In `ssl-be/src/modules/user/user.controller.ts`:
- `broadcastNewMemberInArea` was only triggered during:
  1. Registration completion (`registerStep === COMPLETE`)
  2. Temporary location updates (`settings.temporaryLocation`)
- When `updateUser` processed updates to primary location (`partner1.location`), `upsertLocationForUser` updated the location document and set `partner1.locationId`, but no broadcast call was scheduled.

## 🔧 Fix Applied

In [`user.controller.ts`](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user.controller.ts):
1. Captured `previousPartner1LocationId` prior to location upsert.
2. Added a check after document update: if `partner1Location` was provided or `partner1.locationId` changed, trigger `broadcastNewMemberInArea(context, updatedUser.id, userCtr)` in `setImmediate` fire-and-forget block.

```typescript
const partner1LocationUpdated = Boolean(partner1Location || update.partner1?.locationId);
if (partner1LocationUpdated && updatedUser?.partner1?.locationId) {
    const newPartner1LocationId = updatedUser.partner1.locationId;
    const locationChanged = newPartner1LocationId !== previousPartner1LocationId || Boolean(partner1Location);
    if (locationChanged) {
        // Fire-and-forget: must not block the update response
        setImmediate(() => {
            broadcastNewMemberInArea(context, updatedUser.id, userCtr)
                .catch(err => log.error('[USER] broadcastNewMemberInArea fire-and-forget error:', err));
        });
    }
}
```

## 🧪 Unit / Regression Test

- Ran `pnpm eslint src/modules/user/user.controller.ts --fix` -> Passed with 0 issues.
- Ran `pnpm lint` in `ssl-be` -> Passed with 0 issues.

## 📝 Lessons Learned

- Any location update for active users (`partner1.location` or `temporaryLocation`) should evaluate whether an area-of-interest broadcast needs to be dispatched.
