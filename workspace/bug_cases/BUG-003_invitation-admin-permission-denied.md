# BUG-003: Group Admin/Creator Getting Permission Denied When Inviting Users

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-21
> **Date Fixed:** 2026-07-21
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

A user who is an admin or creator of a group conversation was unable to invite other users to the conversation, receiving the error message: "You do not have permission to invite users to this conversation".

## 🔄 Reproduction Steps

1. Create a group conversation (the creator has `createdById === currentUserId`).
2. Attempt to invite another user to the group.

**Expected behavior:** The invitation should be sent successfully since the user is the group creator or has the ADMIN role.
**Actual behavior:** The user receives a permission denied error.

## 📸 Evidence

```
Error message: "You do not have permission to invite users to this conversation"
```

## 🧠 Root Cause Analysis

1. In `invitationCtr._validateConversationInvitation`, permission checks only verified `inviterParticipant.result?.role === E_ParticipantRole.ADMIN`.
2. Across the codebase (e.g. `conversation.controller.ts`), group admin permissions are granted to both participants with `role === ADMIN` AND the group creator (`conversation.createdById === currentUserId`).
3. Furthermore, `participantCtr.getParticipant` was missing `isDel: false`, which could return soft-deleted participant documents.

**Related files:**
- [invitation.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/invitation/invitation.controller.ts)
- [conversation.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/conversation/conversation/conversation.controller.ts)

## 🔧 Fix Applied

Updated `_validateConversationInvitation` in `invitation.controller.ts` to allow invitations if the user is either a participant with `role === ADMIN` OR the group creator (`conversation.createdById === currentUserId`). Also ensured `isDel: false` is included in participant lookups.

```diff
        const inviterParticipant = await participantCtr.getParticipant({}, {
            filter: { conversationId, userId: currentUserId, isDel: false },
            projection: { id: 1, role: 1 },
        });
+       const isAdmin = inviterParticipant.success && inviterParticipant.result?.role === E_ParticipantRole.ADMIN;
+       const isCreator = conversation.createdById === currentUserId;

-       if (!inviterParticipant.success || inviterParticipant.result?.role !== E_ParticipantRole.ADMIN) {
+       if (!isAdmin && !isCreator) {
            throwError({
                message: 'You do not have permission to invite users to this conversation',
                status: RESPONSE_STATUS.FORBIDDEN,
            });
        }
```

## 📝 Lessons Learned

- Permission checks for group conversations must treat `createdById === currentUserId` as an admin, consistent with `conversation.controller.ts`.
- Always filter out soft-deleted records (`isDel: false`) when querying participants.

## 🔗 References

- Related files: [invitation.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/invitation/invitation.controller.ts)
