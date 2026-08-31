# BUG-028: Free Member Guestbook View Allowed But Commenting Restricted

> **Status:** ✅ Fixed  
> **Date Found:** 2026-07-30  
> **Date Fixed:** 2026-07-30  
> **Project:** SSL (ssl-fe-user / ssl-be)  
> **Severity:** 🟡 Medium  

---

## 🔍 Description

Free members were previously blocked from viewing guestbook comments on other users' profile pages by a frontend restriction card (`isForbiddenGuestbook`). The requirement is that free users should be able to view guestbooks on other profiles, but remain unable to post comments or replies without upgrading.

## 🔄 Reproduction Steps

1. Log in as a free member user.
2. Navigate to another user's profile page.
3. Observe guestbook section.

**Expected behavior:** Free member can view all guestbook comments posted on another profile, but when trying to post a comment or reply, they are prompted to upgrade their membership.  
**Actual behavior:** Free member was blocked from seeing any guestbook comments on other profiles and saw a locked VIP card.

## 🧠 Root Cause Analysis

- `guest-book.tsx` defined `isForbiddenGuestbook = requiresMembership && !isOwnProfile`, which skipped `useGetConversation` and `useGetMessages` GraphQL queries and returned an early lock card preventing guestbook content from loading.

## 🔧 Fix Applied

- **`ssl-fe-user`**:
  - Removed `isForbiddenGuestbook` view lock block in [guest-book.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/(components)/guest-book.tsx).
  - Un-skipped `useGetConversation` and `useGetMessages` for free members viewing other profiles.
  - Retained `requiresMembership` input overlay and updated `handleInitiateReply` so clicking "Reply" on a comment opens `MembershipPopup` for free members.

## 🧪 Unit / Regression Test

- **Test File:** [message-guestbook-delete.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/conversation/message/message-guestbook-delete.test.ts)
- **Command:** `pnpm test src/modules/conversation/message/message-guestbook-delete.test.ts`
- **Result:** Passed (2/2 tests passed).

## 📝 Lessons Learned

- Distinguish between read permissions and write permissions when applying membership tier restrictions. Reading public profile content like guestbooks should be permitted for free members, while writing (commenting) is reserved for VIP members.
