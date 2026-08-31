# BUG-005: Cannot Re-Invite Removed Group Member ("User is already a member of this group")

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-21
> **Date Fixed:** 2026-07-21
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When a group member was removed from a conversation (or left the group) and an admin attempted to invite them back, the backend returned the error: `"User is already a member of this group"`.

## 🔄 Reproduction Steps

1. User A (Admin) invites User B to a group conversation.
2. User B accepts the invitation. (Invitation status becomes `ACCEPTED` on `InvitationModel`, and a `ParticipantModel` document is created).
3. User A removes User B from the group (`removeMember`), which soft-deletes User B's `ParticipantModel` record (`isDel: true`).
4. User A attempts to invite User B back to the same group.

**Expected behavior:** The system updates the existing invitation to `PENDING` and sends User B a new invitation.
**Actual behavior:** The backend returns HTTP 400 with `"User is already a member of this group"`.

## 🧠 Root Cause Analysis

1. In `_handleConversationInvitation` ([invitation.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/invitation/invitation.controller.ts)), the system checked `existingInvitation = InvitationModel.findOne({ type: CONVERSATION, entityId: conversationId, userId, isDel: false })`.
2. When found, it set `isAccepted = existingInvitation.status === E_InvitationStatus.ACCEPTED`.
3. Because the user was previously in the group, the historical `InvitationModel` record still had `status: ACCEPTED`. When the user was removed from the group, the `InvitationModel` status remained unchanged.
4. The check `isAccepted` did NOT verify whether the user was **currently** an active participant in `ParticipantModel` (`filter: { conversationId, userId, isDel: false }`).
5. Furthermore, `createParticipant` in `participant.controller.ts` was missing `isDel: false` in `alreadyParticipant = mongooseCtr.findOne`, which could match soft-deleted participant records.

## 🔧 Fix Applied

1. Updated `_handleConversationInvitation` in `invitation.controller.ts` to check whether the target user is currently an active participant (`isDel: false`) before treating `status: ACCEPTED` as an active membership block. If the user was removed/left, `isAccepted` evaluates to `false`, allowing the invitation status to be updated to `PENDING` and re-sent.
2. Added `isDel: false` to `alreadyParticipant` query in `createParticipant` ([participant.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/conversation/participant/participant.controller.ts)) to ignore soft-deleted participant documents.

## 📝 Lessons Learned

- Historical invitation statuses (such as `ACCEPTED`) can become stale if the user leaves or is removed from an entity. Always check current active membership (`isDel: false`) when validating invitations.
- Always include `isDel: false` when querying active participant records.
