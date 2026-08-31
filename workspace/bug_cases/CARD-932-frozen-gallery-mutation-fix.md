# 🐛 Bug Case: TypeError: Cannot assign to read only property 'url' of object '#<Object>'

## Metadata
- **Date**: 2026-08-10
- **Project**: SSL (SecretSwingerLust)
- **Component**: `ssl-fe-user` (`src/modules/profile/(components)/profile.tsx`)
- **Status**: ✅ Fixed

---

## Symptom
After uploading an avatar and saving profile changes, the page reloads or updates and throws an uncaught JavaScript error:
```
TypeError: Cannot assign to read only property 'url' of object '#<Object>'
    at resolvePartnerGallery (src/modules/profile/(components)/profile.tsx:97:29)
    at Profile.useMemo[partner1Gallery] (src/modules/profile/(components)/profile.tsx:173:15)
```

---

## Root Cause
1. `galleries` objects retrieved from Apollo Client cache in React strict mode / production are **frozen** (`Object.freeze(...)`).
2. `withGalleryOwner(byId, owner)` returns the cached `byId` object reference directly when `uploadedBy` is already populated.
3. In `resolvePartnerGallery`, the code attempted to directly mutate property `resolved.url = profileLevelUrl` and `resolved.thumbnailUrl = profileLevelThumbnailUrl` on the frozen gallery object.
4. Mutating properties on a frozen object throws `TypeError: Cannot assign to read only property 'url' of object '#<Object>'`.

---

## Resolution
Updated `resolvePartnerGallery` in `src/modules/profile/(components)/profile.tsx` to return a new shallow-cloned object (`{ ...resolved, url: profileLevelUrl, ... }`) instead of attempting in-place property mutation on the frozen Apollo Client object.

---

## Verification
- Added unit test in `src/modules/profile/profile-image-upload.test.unit.ts` testing URL resolution against `Object.freeze(...)` objects.
- Ran `pnpm test:unit`: 111/111 unit tests passed across 18 test files.
- Ran `pnpm lint`: 0 errors.
