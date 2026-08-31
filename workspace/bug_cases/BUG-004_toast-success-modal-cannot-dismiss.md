# BUG-004: Success Modal Pop-up OK Button Cannot Dismiss & 2s Auto-Close Delay

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-21
> **Date Fixed:** 2026-07-21
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## 🔍 Description

When a custom toast/modal (such as `toastSuccess`) was shown on the frontend (`ssl-fe-user`), clicking the "OK" button or backdrop failed to close the modal. The modal hung on screen for ~2 seconds before automatically closing when the toast duration expired, making the UI feel slow and unresponsive.

## 🔄 Reproduction Steps

1. Perform an action that triggers `toastSuccess` (e.g. sending an invitation).
2. Click the "OK" button or the backdrop overlay.
3. Observe that the modal does not close immediately upon clicking.
4. Observe that after 2 seconds (`duration: 2000`), the modal unmounts automatically.

## 🧠 Root Cause Analysis

1. `toastSuccess`, `toastError`, and `toastValidationErrors` in `toast-error.tsx` use `react-hot-toast`'s `toast.custom((t: any) => ...)`.
2. When the OK button was clicked, `handleDismiss` called `toast.dismiss(t.id)`.
3. In `react-hot-toast`, `toast.dismiss(t.id)` marks `t.visible = false` in state, but does not unmount custom toast JSX immediately.
4. The render function inside `toast.custom` did not check `if (!t.visible) return null;` nor did it invoke `toast.remove(t.id)`.
5. As a result, the modal remained rendered on screen despite `t.visible` turning `false`, hanging until `react-hot-toast`'s 2000ms duration timer expired and called `toast.remove`.

## 🔧 Fix Applied

1. Added `if (!t.visible) return null;` to early-return when a toast is dismissed.
2. Updated `handleDismiss` to call both `toast.dismiss(t.id)` and `toast.remove(t.id)` to force immediate removal from the active toast store.

**File modified:**
- [toast-error.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/toast-error.tsx)

## 📝 Lessons Learned

- When building custom modal UI with `toast.custom` in `react-hot-toast`, custom components MUST inspect `t.visible` or call `toast.remove(t.id)` to ensure instant user dismissals.
