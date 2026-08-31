# CARD-934: Profile Editing Double-Click Save Bug Fix

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-11
> **Date Fixed:** 2026-08-11
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🟠 High

---

## 🔍 Description

When editing profile details (such as bio text, seeking/preference tags, or languages), clicking the "Save" button saved changes only after being clicked a second time.

## 🔄 Root Cause Analysis

1. **Async Effect Lag (`latestFormDataRef`)**:
   `Profile` read submit payload data from `latestFormDataRef.current`. Previously, `latestFormDataRef.current` was updated only in a post-render `useEffect(() => { latestFormDataRef.current = formData; }, [formData])`. As a result, immediate button clicks submitted stale form data from prior render frames.
2. **Unsynchronized Tag Handlers**:
   `handleTagChange` called `setFormData((prev) => ...)` but did not update `latestFormDataRef.current` synchronously within the functional update.
3. **Lexical Bio Editor Stale Closure**:
   `LexicalEditor` `onChange` constructed `updatedData` by spreading `latestFormDataRef.current` rather than using a functional updater, risking overwriting recently selected tags with stale values.
4. **Un-flushed Input Focus on Click**:
   Clicking "Save" while focused inside a text editor or input field triggered the button's `onClick` simultaneously with the input's `onBlur`/`onChange`. `handleSubmit` executed before the state update could re-render the component.

## 🛠️ Resolution

1. **Synchronous Ref Sync**:
   Added `latestFormDataRef.current = formData;` in `Profile`'s render body and updated `latestFormDataRef.current` synchronously inside `handleTagChange` and `LexicalEditor` `onChange`.
2. **Active Element Blur**:
   Added `document.activeElement.blur()` at the top of `handleSave` in `profile-header.tsx` to force active inputs to commit pending changes before `onSubmit()` executes.
3. **Immediate Modal/Edit Mode Closure**:
   Unblocked `handleSubmit` from awaiting `refetchUser()` network roundtrip, allowing `handleSubmit()` to return `true` immediately when `updateUser` succeeds. `handleSave` calls `setIsEditMode(false)` instantly on successful save, while `refetchUser()` updates user data in the background. In `edit-location-modal.tsx`, updated `result?.success` check to close `EditLocationModal` immediately upon location save.
4. **Regression Tests**:
   Verified existing test suite passed.
