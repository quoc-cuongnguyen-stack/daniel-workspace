# BUG-Card-932: Profile Image Upload Silently Fails on Desktop Due to Split State Architecture

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-10
> **Date Fixed:** 2026-08-10
> **Project:** SSL / ssl-fe-user
> **Severity:** 🔴 Critical

---

## 🔍 Description

Users reported that profile image uploads silently failed: after choosing and cropping a photo, clicking Save appeared to work, but the avatar was never updated on the server. PostHog recordings showed that while `AVATAR_UPLOADED` was recorded during initial signup, no upload occurred when editing the profile on desktop viewports.

## 🔄 Reproduction Steps

1. Log into a user account on desktop viewport (`>= sm`).
2. Go to Edit Profile page.
3. Click "Change Profile Picture" inside the body section (`Profile` component upload zone).
4. Select and crop an image.
5. Click the "Save" button at the bottom of the page (`ProfileHeader` component).

**Expected behavior:** The selected image is uploaded to the backend and the avatar updates.
**Actual behavior:** The form saves without triggering avatar upload. The selected image is silently lost.

## 📸 Evidence

- PostHog session recording `019fe6ae-6dae-7a36-bdb4-7bf35e7387d3` (user: rhino76)
- At timestamp `02:23`: User selected image via body upload zone.
- At timestamp `02:40`: User clicked Save button.
- At timestamp `02:53-02:56`: No `AVATAR_UPLOADED` event fired. No network request sent to `/graphql` for `uploadUserAvatar`.

## 📊 PostHog Evidence

**Session Recording:** [PostHog Shared Link](https://eu.posthog.com/shared/lKJRNVOJGGZtSbg6VsTDXRz403FONg?t=116)

**User Journey (from PostHog events):**
1. User entered edit mode at 02:13.
2. User selected image in desktop body upload box at 02:23.
3. User clicked Save at 02:40.
4. No upload event fired; user gave up and navigated away at 03:03.

## 🧠 Root Cause Analysis

The profile edit page had **split state**: `ProfileHeader` and `Profile` each declared their own local `partner1Image` / `partner2Image` `useState` hooks and their own `uploadAvatar` functions.

- **Mobile Viewport (`< sm`):** Renders upload controls via `ProfileHeader`'s `renderUploadSection`. Selecting an image updated `ProfileHeader.partner1Image`, which `ProfileHeader.handleSave` read.
- **Desktop Viewport (`>= sm`):** Renders upload controls via `Profile` component (`sm:block hidden`). Selecting an image updated `Profile.partner1Image`.
- **Save Action:** The Save button is rendered inside `ProfileHeader`, calling `ProfileHeader.handleSave`. `ProfileHeader.handleSave` checked its OWN `partner1Image` state (which was `null` on desktop), so it skipped the `uploadAvatar` mutation.

Additionally, `Profile.handleSubmit` (called via imperative ref) attempted to handle image upload, but suffered from stale closure issues with `useImperativeHandle` and `useCallback` when invoked from the parent.

**Related files:**
- [profile.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/profile.page.tsx)
- [profile-header.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/(components)/profile-header.tsx)
- [profile.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/(components)/profile.tsx)

## 🔧 Fix Applied

1. **Lifted State:** Lifted `partner1Image` and `partner2Image` state to the common parent component `profile.page.tsx`.
2. **Single Upload Point:** Passed state and setters as props to `ProfileHeader` and `Profile`. `ProfileHeader.handleSave` is now the single source of truth for uploading avatars.
3. **Removed Duplicate Upload:** Removed `uploadUserAvatar` and image upload logic from `Profile.handleSubmit`. `Profile` now only updates user form metadata (`updateUser`).
4. **State Cleanup:** Reset `partner1Image` and `partner2Image` to `null` upon successful save or cancellation.

```diff
// profile.page.tsx
+ const [partner1Image, setPartner1Image] = useState<File | null>(null);
+ const [partner2Image, setPartner2Image] = useState<File | null>(null);

<ProfileHeader
+ partner1Image={partner1Image}
+ setPartner1Image={setPartner1Image}
...
/>
<Profile
+ partner1Image={partner1Image}
+ setPartner1Image={setPartner1Image}
...
/>
```

## 🧪 Unit / Regression Test

- **Test File:** [profile-image-upload.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/profile-image-upload.test.unit.ts)
- **Command:** `pnpm test:unit`
- **Test Results:** 2 unit tests asserting shared state propagation and state cleanup passed cleanly.

## 📝 Lessons Learned

- Avoid duplicate `useState` hooks for the same logical user data across sibling components.
- Always lift shared form state to the common parent component when controls in one component trigger actions based on input in another.

## 🔗 References

- Knowledge item: `card-932-profile-avatar-upload-split-state`
