# Bug Case BUG-037: Group Conversation Unread Indicators & Header Badge Fixes

## Summary
- **Date**: 2026-08-04
- **Project**: SSL
- **Severity**: Medium (UX / Visual State Inconsistency)
- **Status**: ✅ Fixed

---

## Symptoms
1. In the header tabs on `/en/message`, the green dot badge (`GROUPS`) did not appear when a group conversation had a new unread message.
2. When clicking "See all messages" in the Notification panel for a group notification or opening `/en/message`, group conversations with new unread messages did not show the unread indicator bar on the group list item.
3. Once the group conversation was opened, the unread indicator disappeared as expected. However, if the user left Messages and returned to the Group tab, the unread indicator briefly reappeared for ~2 seconds before disappearing again.

---

## Root Causes & Resolutions

1. **Header Tab Unread Badge Initialization**:
   - `MessagePage` rendered `<Private />` when `activeTab === '1'`, leaving `<Group />` unmounted on initial page load.
   - Because `<Group />` was unmounted, `useGetMyGroupConversations` query was not executed on initial load, leaving `hasNewGroup` as `false` and omitting the green dot badge from the `GROUPS` tab header.
   - **Fix**: Updated [message.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/message.page.tsx) to execute top-level `useGetMyGroupConversations` and `useGetMyPrivateConversations` hooks and evaluate unread statuses on mount so the green dot badge appears on the `GROUPS` tab header immediately upon page load.

2. **Auto-Selecting & Auto-Marking Unread Group from `sessionStorage` on Mount**:
   - `group.tsx` (and `private.tsx`) had an effect that auto-restored the last active conversation ID from `sessionStorage` on mount when no `conversationId` URL parameter was present.
   - If that restored group had unread messages, auto-selecting it on mount triggered `markAllMessagesAsRead` immediately in the background, clearing its unread state before the user could see the group list or click the item.
   - **Fix**: Updated `sessionStorage` restoration in [group.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/component/group.tsx) and [private.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/component/private.tsx) so unread conversations are **never auto-selected from `sessionStorage` on mount** unless explicitly targeted via `conversationId` parameter in the URL.

3. **"See all messages" Notification Footer Link Routing**:
   - In `notification.page.tsx`, the "See all messages" footer link targeted `ROUTES.MESSAGE` (`/en/message`) without query parameters, defaulting to Tab 1 (Private Messages).
   - **Fix**: Updated [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx) so "See all messages" targets `ROUTES.MESSAGE?tab=2` (Groups Tab) whenever group message notifications are present.

---

## Affected Files
- `ssl-fe-user/src/modules/conversation/message.page.tsx`
- `ssl-fe-user/src/modules/conversation/component/group.tsx`
- `ssl-fe-user/src/modules/conversation/component/private.tsx`
- `ssl-fe-user/src/modules/notification/notification.page.tsx`
- `ssl-fe-user/src/modules/conversation/component/group-unread-indicator.test.unit.ts`
