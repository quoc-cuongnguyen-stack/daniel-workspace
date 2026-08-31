# Bug Analysis: Gallery Image Deletion Page Reloading & 1-2s Delay

## Metadata
- **Bug Title**: Gallery Image Removal Triggers Full Page Loading State & 1-2s Network Refetch Delay
- **Affected File(s)**: 
  - [gallery.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/gallery/gallery.page.tsx)
  - [gallery.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/gallery/gallery.hook.ts)
  - [card-gallery.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/card/card-gallery.tsx)
- **Component**: Gallery Page / Media Management
- **Date**: 2026-08-06

---

## Symptom
Deleting an image from the Gallery page caused the browser to enter a 1-2 second loading state while waiting for background GraphQL mutation responses and network query refetches to resolve.

---

## Root Cause Analysis
1. **Apollo Fetch Policy `no-cache`**: `useGetGalleries` in [gallery.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/gallery/gallery.hook.ts) had `fetchPolicy: 'no-cache'`, clearing `data` to `undefined` on refetch.
2. **Duplicate Network Refetch Calls**: `useDeleteGallery` had `refetchQueries: ['GetGalleries']` while `handleDeleteGallery` in [gallery.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/gallery/gallery.page.tsx) also executed `handleRefetch()`, sending duplicate network requests and creating a 1-2s wait time.
3. **No Direct Apollo Cache Eviction**: Deleting an item did not evict the item directly from Apollo memory cache.

---

## Resolution
1. **Updated Apollo `fetchPolicy`**: Changed `fetchPolicy: 'no-cache'` to `fetchPolicy: 'network-only'` in [gallery.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/gallery/gallery.hook.ts).
2. **Direct Apollo Cache Eviction**: Added `cache.evict({ id: cache.identify({ __typename: 'T_Gallery', id: galleryId }) })` and `cache.gc()` in `useDeleteGallery` update callback, eliminating the need for `refetchQueries: ['GetGalleries']`.
3. **Removed Unnecessary `handleRefetch`**: Removed manual `handleRefetch()` from `handleDeleteGallery` in [gallery.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/gallery/gallery.page.tsx) so deletion completes in 0ms with instant optimistic UI removal.
