# Bug Case: Profile Avatar Delete Button Duplicate Calls & Missing Loading State

## 1. Symptom & Problem Statement
When a user clicked the Trash icon to delete a profile avatar photo in edit mode, no visual loading indicator was displayed. Users could rapidly click the button multiple times, sending duplicate concurrent `deleteGallery` GraphQL mutation requests to the backend.

## 2. Root Cause
1. In `profile-header.tsx` and `profile.tsx`, `handleDeleteGallery` called `deleteGallery(galleryId)` without keeping track of in-flight deletion request state (`deletingGalleryId`).
2. The `<Button>` rendering the trash icon lacked the `disabled` property during mutation execution.
3. The trash icon `<Trash2 />` remained statically displayed without replacing it with an animated `<Loader2 className="animate-spin" />` spinner when deletion was active.

## 3. Resolution Applied
1. **State Tracking & Guard**: Added `const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);` in both `profile-header.tsx` and `profile.tsx`.
2. **Early Exit Guard**: Updated `handleDeleteGallery` to return early if `deletingGalleryId` is already set:
   ```ts
   const handleDeleteGallery = useCallback(
       async (galleryId: string) => {
           if (deletingGalleryId) return;
           setDeletingGalleryId(galleryId);
           try {
               await deleteGallery(galleryId);
               refetchUser?.();
               refetchGalleries?.();
           }
           finally {
               setDeletingGalleryId(null);
           }
       },
       [deleteGallery, refetchUser, refetchGalleries, deletingGalleryId],
   );
   ```
3. **UI Loading Feedback & Disabled State**:
   Updated the `<Button>` component:
   - `disabled={Boolean(deletingGalleryId)}`
   - Replaced `<Trash2 />` icon with `<Loader2 size={20} className="animate-spin" />` when `deletingGalleryId === gallery.id`.

## 4. Verification
- `pnpm test:unit`: 112/112 unit tests passed.
- `pnpm lint`: Completed with 0 errors.
