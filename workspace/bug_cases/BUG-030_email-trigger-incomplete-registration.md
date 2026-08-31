# BUG-030: Email & Notification Trigger Activated During Preference Stage (Incomplete Registration)

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-03
> **Date Fixed:** 2026-08-03
> **Project:** SSL (ssl-be)
> **Severity:** 🟠 High

---

## 🔍 Description

During user onboarding at step 4 (`PREFERENCES`), when the user specifies their location, `updateUser` updates the location document and sets `shouldBroadcastNewMember = true`. This triggers `broadcastNewMemberInArea` which dispatches `NEW_MEMBER_IN_YOUR_AREA_OF_INTEREST` push notifications and emails to nearby members.

However, because the user's `registerStep` is still `PREFERENCES` (not `COMPLETE`), public user read policies (`user-read.policy.ts`) filter out incomplete user profiles. When notification recipients click the email/push link, the system reports that the profile has been deleted or returns a 404 error.

## 🔄 Reproduction Steps

1. Start user registration up to step 4 (`PREFERENCES`).
2. Provide primary location (`partner1.location`).
3. Observe `userCtr.updateUser` setting `shouldBroadcastNewMember = true` because `partner1LocationUpdated` is truthy.
4. `broadcastNewMemberInArea` fires and sends emails/notifications to nearby users.
5. Nearby user receives email and clicks profile link (`/profile/username`).
6. **Expected behavior:** Broadcast should only trigger when user completes registration (`registerStep === COMPLETE`), ensuring the profile is publicly visible.
7. **Actual behavior:** Notification is sent prematurely; clicking link displays "profile has been deleted".

## 📸 Evidence

Task 909:
```
The email trigger is activated at the preference stage before the user’s profile has been fully created. This means that people can click on the new profile notification and receive a message saying that the profile has been deleted.
```

## 🧠 Root Cause Analysis

In `user.controller.ts` inside `updateUser`:
```ts
const partner1LocationUpdated = Boolean(partner1Location || update.partner1?.locationId);
if (partner1LocationUpdated && updatedUser?.partner1?.locationId) {
    const newPartner1LocationId = updatedUser.partner1.locationId;
    const locationChanged = newPartner1LocationId !== previousPartner1LocationId || Boolean(partner1Location);
    if (locationChanged) {
        shouldBroadcastNewMember = true;
    }
}
```
And:
```ts
if (shouldBroadcastNewMember && updatedUser?.id) {
    broadcastNewMemberInArea(context, userIdToBroadcast, userCtr)...
}
```
`updateUser` did not verify if `updatedUser?.registerStep === E_RegisterStep.COMPLETE` before triggering `broadcastNewMemberInArea`. Furthermore, `broadcastNewMemberInArea` in `user.util.ts` only checked `hasLocation` but did not verify `newUser.registerStep === E_RegisterStep.COMPLETE`.

**Related files:**
- [user.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user.controller.ts#L1151)
- [user.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user.util.ts#L440)
- [user-read.policy.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user-read.policy.ts#L53)

## 🔧 Fix Applied

1. Added `updatedUser?.registerStep === E_RegisterStep.COMPLETE` check in `user.controller.ts` before calling `broadcastNewMemberInArea`.
2. Added fail-safe `newUser.registerStep !== E_RegisterStep.COMPLETE` guard inside `broadcastNewMemberInArea` in `user.util.ts` to log and abort early if registration is incomplete.

```diff
// user.controller.ts
- if (shouldBroadcastNewMember && updatedUser?.id) {
+ if (shouldBroadcastNewMember && updatedUser?.id && updatedUser?.registerStep === E_RegisterStep.COMPLETE) {

// user.util.ts
+ if (newUser.registerStep !== E_RegisterStep.COMPLETE) {
+     log.info('[USER] broadcastNewMemberInArea: user registration not complete — skipping', { newUserId, registerStep: newUser.registerStep });
+     return;
+ }
```

## 🧪 Unit / Regression Test

- **Test File:** [user-broadcast-registration.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user-broadcast-registration.test.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/user/user-broadcast-registration.test.ts`
- **Test Results:** 2 passed out of 2. Confirmed incomplete registrations (`PREFERENCES`) skip `getUsers` and notification broadcasts, while complete registrations (`COMPLETE`) proceed.

## 📝 Lessons Learned

- Always check entity state / lifecycle stage (e.g. `registerStep === COMPLETE`) before firing public-facing notifications or broadcasts.
- Implement defense-in-depth checks both at invocation call-sites and inside background worker/utility functions.

## 🔗 References

- Related task: Superthread Task 909
