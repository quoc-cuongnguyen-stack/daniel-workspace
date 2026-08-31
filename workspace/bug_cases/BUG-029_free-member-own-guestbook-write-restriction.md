# BUG-029: Non-paying member able to type & write in own guestbook UI despite write restrictions

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-30
> **Date Fixed:** 2026-07-30
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🟡 Medium

---

## 🔍 Description

Non-paying (free) members should be allowed to view guestbook comments on all profiles and delete entries from their own guestbook, but cannot write comments or reply to messages in any guestbook. Backend `getConversation` and `getMessages` had leftover 403 checks blocking free members from viewing guestbooks, while frontend `guest-book.tsx` had an exception allowing free members to type on their own profile.

## 🔄 Reproduction Steps

1. Log in as a free (non-paying) user.
2. Navigate to another user's profile guestbook.
3. Backend threw `403 FORBIDDEN` ("Free users can only view their own guestbook"), preventing guestbook viewing.

**Expected behavior:** Non-paying member can view guestbook entries on all profiles, can delete entries from their own guestbook, but cannot write/reply (UI input locked + MembershipPopup triggered on click/reply).
**Actual behavior:** Free member was blocked from viewing guestbook comments on other profiles due to backend 403 guards.

## 🛠️ Root Cause Analysis

1. In `ssl-be`: `getConversation` in `conversation.controller.ts` and `getMessages` in `message.controller.ts` threw 403 FORBIDDEN when a free member requested another user's guestbook.
2. In `ssl-fe-user`: `requiresMembership` in `guest-book.tsx` was defined as `isFreeMember(auth?.user) && !isViewingOwnProfile`, which incorrectly exempted free members from writing restrictions on their own profile.

## 🩹 Resolution

1. **Backend (`ssl-be`)**: Removed 403 checks from `getConversation` and `getMessages` for guestbooks (`PROFILE_COMMENT`), and updated PubSub filter to allow free users to view and receive guestbook comment updates. Commenting/creation restrictions (`createConversation`, `sendMessage`) remain strictly enforced (403 FORBIDDEN for free users).
2. **Frontend (`ssl-fe-user`)**: Updated `requiresMembership = isFreeMember(auth?.user)` so input textareas/reply buttons trigger `MembershipPopup` for free users on all profiles. Deletion rights (`canDelete`) remain active for profile owners.

## 🧪 Verification

- Ran FE unit tests (`pnpm test:unit` in `ssl-fe-user`), all 14 test suites (86 tests) passed.
- Ran BE unit tests (`pnpm test:unit src/modules/conversation/message/message-guestbook-delete.test.ts`), passed cleanly.
- Ran ESLint on updated FE and BE files, zero errors/warnings.
