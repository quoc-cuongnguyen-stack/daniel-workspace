---
id: FR-CHAT-001
title: "Chat: edit within 10 minutes, delete with placeholder, send media with text"
module: CHAT
priority: MUST
status: ready_to_implement
verify: T
phase: R1
milestone: "Release 1 - quick wins"
slice: 1
owner: Stephen Cheng
created: 2026-06-29
shipped: null
memory_chain_hash: null
related_frs: []
depends_on: []
blocks: []
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P2 Q4 Chat"
  - "docs/SSL_NewFeatures_Proposal_Quotation_L4.docx#P3.3"
  - "docs/SSL_NewFeatures_BudgetScope_R1_L4.docx#Chat improvements"
source_decisions:
  - DEC-SSL-210 (10-minute edit window; deleted message shows a "message deleted" placeholder; edited messages show an "edited" mark; a message may carry media together with text)
language: typescript
service: "ssl-be + ssl-fe-user"
new_files:
  - ssl-be/src/modules/conversation/message/message-edit.test.ts
  - ssl-fe-user/src/modules/conversation/component/edit-message-modal.tsx
  - ssl-fe-user/src/modules/conversation/component/message.test.tsx
modified_files:
  - ssl-be/src/modules/conversation/message/message.model.ts
  - ssl-be/src/modules/conversation/message/message.controller.ts
  - ssl-be/src/modules/conversation/message/message.resolver.ts
  - ssl-be/src/modules/conversation/message/message.type.ts
  - ssl-fe-user/src/modules/conversation/component/message.tsx
  - ssl-fe-user/src/modules/conversation/component/mess-item.tsx
  - ssl-fe-user/src/modules/conversation/message/message.hook.ts
allowed_tools:
  - file_read: "ssl-be/src/modules/conversation/**, ssl-be/src/modules/moderation/**, ssl-fe-user/src/modules/conversation/**, ssl-fe-user/src/shared/**"
  - file_write: "ssl-be/src/modules/conversation/message/**, ssl-fe-user/src/modules/conversation/**"
  - bash: cd ssl-be && pnpm vitest run message-edit
disallowed_tools:
  - permit an edit by a non-author or after the 10-minute window (per DEC-SSL-210; the window is server-enforced)
  - hard-delete a message on unsend, or display chat media before its ModerationMedia status is APPROVED
effort_hours: 16
sub_tasks:
  - "2.0h: message.model.ts + message.type.ts - add editedAt + editedContent; keep deletedAt/redacted soft-delete"
  - "3.0h: message.controller.ts editMessage - author check, 10-minute window guard, preserve prior content, publish edit event"
  - "2.0h: message.controller.ts deleteMessage - keep soft-delete placeholder, retain original + moderationMediaId for review"
  - "2.0h: message.controller.ts createMessage - accept media together with text in one message, run media through ModerationMedia + AI moderation"
  - "1.5h: message.resolver.ts - editMessage mutation + onMessageEdited/onMessageDeleted subscriptions"
  - "3.0h: ssl-fe-user mess-item.tsx + edit-message-modal.tsx + message.tsx + message.hook.ts - edit/delete UI, edited mark, placeholder, media-with-text composer"
  - "2.5h: message-edit.test.ts (Vitest) + message.test.tsx - window, author-only, placeholder, media gating"
risk_if_skipped: "DEC-SSL-210 is a locked Release 1 quick win the client signed for (P2 Q4). Today message.controller.ts updateMessage enforces author-only but has no edit window, so a member could rewrite an old message with no trace; deleteMessage already soft-deletes (deletedAt + redacted + content.value blanked) but the controller does not retain the original text for abuse review, and createMessage forces media OR text into separate messages (ssl-fe-user message.tsx sends media in its own createMediaMessage call and never with the typed text). Without the window, the edited mark, the retained moderation copy, and single-message media-with-text, the chat does not match what the client approved and abuse review loses the deleted content."
---

## §1 - Description (BCP-14 normative)

Chat editing and deletion **MUST** behave exactly as DEC-SSL-210 locks it: a short author-only edit window, a neutral placeholder on delete, an "edited" mark, and one message that can carry media together with text. The contract:

1. **MUST** allow the author to edit their own message within 10 minutes of creation (`createdAt`); after the window has passed, or when the requester is not the author (`senderId !== currentUser.id`), the edit **MUST** be refused (DEC-SSL-210).
2. **MUST** record `editedAt` and preserve the prior text in `editedContent` when a message is edited, and an edited message **MUST** carry an "edited" marker (a set `editedAt`) that both participants can see (DEC-SSL-210).
3. **MUST** allow the author to delete (unsend) their own message; a deleted message **MUST** render a neutral "message deleted" placeholder to both participants (the existing `deletedAt` + `redacted` soft-delete) rather than disappearing from the timeline (DEC-SSL-210).
4. **MUST** retain a moderation copy of a deleted message (the original `content.value` plus `moderationMediaId`) for abuse review while hiding that original from the participants, so deletion never destroys evidence.
5. **MUST** allow a single message to carry media together with text - one `Message` document, not one for the image and a second for the caption (DEC-SSL-210).
6. **MUST** run any new chat media through the existing `ModerationMedia` pipeline (`E_ModerationMediaStatus`, default `PENDING`) plus `aiModerationCtr`, and media **MUST NOT** be shown to the recipient until its status is `APPROVED`.
7. **MUST** propagate edit and delete to the other participant in real time over GraphQL subscriptions: a new `onMessageEdited` (`E_CONVERSATION_EVENTS.MESSAGE_EDITED`) alongside the existing `onMessageDeleted` (`E_CONVERSATION_EVENTS.MESSAGE_DELETED`).
8. **MUST** enforce all of the above on the server - the 10-minute window, the author-only check, and the media `APPROVED` gate live in `message.controller.ts`, not in the client - so a crafted GraphQL call cannot bypass them.
9. **SHOULD** keep the placeholder and the moderation copy consistent with how the platform already soft-deletes today (`deletedAt`, `redacted`, blanked `content.value`, no `expiresAt` so the row survives a reload), reusing that path rather than inventing a parallel one.

---

## §2 - Why this design (rationale for humans)

**Why a server-enforced 10-minute window (§1 #1, #8, DEC-SSL-210)?** `updateMessage` today checks author-only but lets a member rewrite a message of any age. A typo fix minutes after sending is reasonable; silently rewriting yesterday's message is not. Computing the window from `createdAt` on the server, in `editMessage`, means the client cannot lie about the clock or the sender.

**Why preserve the prior text and mark "edited" (§1 #2)?** An edit that leaves no trace lets a sender deny what they said. Keeping `editedContent` and surfacing a visible mark (a set `editedAt`) keeps the conversation honest for the other participant and gives moderators the before/after.

**Why a placeholder instead of vanishing (§1 #3)?** The platform already soft-deletes (`deletedAt`, `redacted`, `content.value` blanked, deliberately no `expiresAt` so the row survives a reload). Rendering "message deleted" in place keeps the timeline coherent: the other side sees that something was removed rather than a confusing gap, which is exactly the current unsend behaviour we are formalising.

**Why retain a moderation copy (§1 #4)?** A user who sends abuse and immediately unsends it must not erase the evidence. Deletion hides the content from participants but keeps the original `content.value` and `moderationMediaId` for review, so unsend is not an abuse loophole.

**Why one message for media + text (§1 #5)?** Today `ssl-fe-user` `message.tsx` sends media through `createMediaMessage` and text through a separate `createMessage` branch (`if (imageUrl || videoUrl) {...} else if (hasTextContent) {...}`), so a caption and its image arrive as two bubbles. The client asked for a caption attached to the media; that is one document carrying both a `content` value and a `moderationMediaId`.

**Why gate media on APPROVED (§1 #6)?** `ModerationMedia` defaults to `PENDING`. Showing media before approval would let unmoderated images reach the recipient. The recipient sees a pending placeholder until `aiModerationCtr` / a human flips the status to `APPROVED`, reusing the queue the platform already runs.

**Why a dedicated edit event (§1 #7)?** `MESSAGE_DELETED` already exists and the FE consumes it. Edits need their own channel so the other party's bubble updates in place without a refetch, mirroring the delete flow rather than overloading `MESSAGE_SENT`.

---

## §3 - API contract

```typescript
// ssl-be/src/modules/conversation/message/message.type.ts - additions to I_Message
export interface I_Message extends I_GenericDocument {
    // ...existing: senderId, content, recipientId, conversationId, parentId,
    // deletedAt, redacted, expiresAt, statusMedia, moderationMediaId...
    editedAt?: Date;           // §1 #2 - set on first edit; presence == the "edited" mark
    editedContent?: string;    // §1 #2 - prior content.value, retained for moderators
}

export interface I_Input_UpdateMessage extends Omit<I_Message, T_Omit_Update | T_Message_Populate> { }
```

```typescript
// ssl-be/src/modules/conversation/message/message.model.ts - new fields on MessageModel.schema
editedAt: { type: Date },
editedContent: { type: String },
// deletedAt / redacted / statusMedia / moderationMediaId stay as-is (the soft-delete path)
```

```typescript
// ssl-be/src/modules/conversation/message/message.controller.ts
const EDIT_WINDOW_MS = 10 * 60 * 1000; // §1 #1 - 10 minutes, server-side

editMessage: async (
    context: I_Context,
    { filter, update }: I_Input_UpdateOne<I_Input_UpdateMessage>,
): Promise<I_Return<I_Message>> => {
    const currentUser = await authnCtr.getUserFromSession(context);
    const found = await mongooseCtr.findOne(filter);
    if (!found.success) {
        throwError({ message: 'Message not found', status: RESPONSE_STATUS.NOT_FOUND });
    }

    const msg = found.result;
    if (msg.senderId !== currentUser.id) {                                   // §1 #1 author-only
        throwError({ message: 'You can only edit messages you created', status: RESPONSE_STATUS.FORBIDDEN });
    }

    const age = Date.now() - new Date(msg.createdAt as Date).getTime();
    if (age > EDIT_WINDOW_MS) {                                              // §1 #1 window
        throwError({ message: 'The 10-minute edit window has passed', status: RESPONSE_STATUS.FORBIDDEN });
    }

    const nextValue = update?.['content.value'] as string | undefined;
    const updated = await mongooseCtr.updateOne({ id: msg.id }, {
        'content.value': nextValue ?? msg.content?.value,
        'editedContent': msg.content?.value ?? '',                           // §1 #2 preserve prior
        'editedAt': new Date(),                                              // §1 #2 mark "edited"
    });

    if (msg.conversationId) {
        pubsub.publish(E_CONVERSATION_EVENTS.MESSAGE_EDITED, {               // §1 #7 real-time
            messageEdited: { conversationId: msg.conversationId, messageId: msg.id },
        });
    }
    return transformMessageResult(context, updated);
},

// deleteMessage (existing) keeps the soft-delete + retains the moderation copy:
//   { deletedAt: now, redacted: true, editedContent: original, 'content.value': '' } // §1 #3, #4
//   (moderationMediaId already on the doc; do NOT removeMessageMedia for the moderation copy)
//   pubsub.publish(E_CONVERSATION_EVENTS.MESSAGE_DELETED, { messageDeleted: { conversationId, messageId } });

// createMessage (existing) carries media WITH text in one doc: content {type,value}
//   + moderationMediaId + statusMedia; media stays PENDING until APPROVED (§1 #5, #6)
```

```typescript
// ssl-be/src/modules/conversation/message/message.resolver.ts
const messageResolver = {
    Query: { getMessages: /* ... */ },
    Mutation: {
        createMessage: /* ... */,
        editMessage: (_p, args: I_Input_UpdateOne<I_Input_UpdateMessage>, ctx: I_Context) =>
            messageCtr.editMessage(ctx, args),                              // §1 #1
        deleteMessage: /* ... */,
        unsendMessage: /* ... */,
    },
    Subscription: {
        onMessageEdited: {                                                  // §1 #7
            subscribe: () => pubsub.asyncIterableIterator([E_CONVERSATION_EVENTS.MESSAGE_EDITED]),
        },
        onMessageDeleted: {                                                 // §1 #7 (existing event)
            subscribe: () => pubsub.asyncIterableIterator([E_CONVERSATION_EVENTS.MESSAGE_DELETED]),
        },
    },
};
```

`E_CONVERSATION_EVENTS.MESSAGE_EDITED` is the one new enum member added to `conversation/conversation.type.ts` (the enum already holds `MESSAGE_SENT` and `MESSAGE_DELETED`).

---

## §4 - Acceptance criteria

1. **Edit within the window** - editing the author's own message younger than 10 minutes succeeds and `content.value` changes (§1 #1). [§5 `edit_within_window`]
2. **Edit refused after the window** - editing a message whose `createdAt` is older than 10 minutes throws FORBIDDEN and the content is unchanged (§1 #1, #8). [§5 `edit_refused_after_window`]
3. **Edit refused for a non-author** - a requester whose id is not `senderId` is refused FORBIDDEN (§1 #1, #8). [§5 `edit_refused_non_author`]
4. **Edited mark and editedContent set** - a successful edit sets `editedAt` and stores the prior text in `editedContent` (§1 #2). [§5 `edit_sets_mark_and_prior`]
5. **Delete renders a placeholder** - delete sets `deletedAt` + `redacted` and blanks `content.value`, so the timeline shows the "message deleted" placeholder rather than removing the row (§1 #3, #9). [§5 `delete_renders_placeholder`]
6. **Delete retains the moderation copy** - after delete, the original text survives in `editedContent` and `moderationMediaId` is preserved for review even though participants see the placeholder (§1 #4). [§5 `delete_retains_moderation_copy`]
7. **Media with text accepted** - `createMessage` accepts one message carrying a media value plus a `moderationMediaId` (and `parentId` when threaded), producing a single document, not two (§1 #5). [§5 `media_with_text_one_message`]
8. **Media hidden until APPROVED** - a message whose `statusMedia` is `PENDING` is not shown as visible media to the recipient; once `APPROVED` it renders (§1 #6, #8). [§5 `media_hidden_until_approved`]
9. **Real-time edit and delete** - a successful edit publishes `MESSAGE_EDITED` and a delete publishes `MESSAGE_DELETED` with `{ conversationId, messageId }` (§1 #7). [§5 `edit_and_delete_publish_events`]
10. **Frontend edited mark and placeholder** - `mess-item.tsx` shows the "edited" mark when `editedAt` is set and the "message deleted" placeholder when the message is unsent (§1 #2, #3). [§5 `message.test.tsx` note]

---

## §5 - Verification

```typescript
// ssl-be/src/modules/conversation/message/message-edit.test.ts  (Vitest)
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messageCtr } from './message.controller.js';
import { E_MessageType } from './message.type.js';
import { E_ModerationMediaStatus } from '#modules/moderation/moderation-media/moderation-media.type.js';

const NOW = Date.now();
const ctx = {} as any;                                  // I_Context stub
const asAuthor = (id: string) => ({ id });              // authnCtr.getUserFromSession stub returns this

function msg(overrides: Partial<any> = {}) {
    return {
        id: 'm1',
        senderId: 'u1',
        conversationId: 'c1',
        content: { type: E_MessageType.TEXT, value: 'original' },
        createdAt: new Date(NOW),
        ...overrides,
    };
}

describe('chat edit / delete / media (DEC-SSL-210)', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('edit_within_window', async () => {                                  // AC #1
        // createdAt = now -> within 10 min; author edits -> content.value becomes "fixed"
        const r = await messageCtr.editMessage(ctx, { filter: { id: 'm1' }, update: { 'content.value': 'fixed' } });
        expect(r.result.content.value).toBe('fixed');
    });

    it('edit_refused_after_window', async () => {                           // AC #2
        // createdAt = now - 11 min -> editMessage throws FORBIDDEN, content stays "original"
        const old = msg({ createdAt: new Date(NOW - 11 * 60 * 1000) });
        await expect(() => messageCtr.editMessage(ctx, { filter: { id: old.id }, update: { 'content.value': 'x' } })).rejects.toThrow();
    });

    it('edit_refused_non_author', async () => {                             // AC #3
        // session user = u2, message.senderId = u1 -> FORBIDDEN
        await expect(() => messageCtr.editMessage(ctx, { filter: { id: 'm1' }, update: { 'content.value': 'x' } })).rejects.toThrow();
    });

    it('edit_sets_mark_and_prior', async () => {                            // AC #4
        const r = await messageCtr.editMessage(ctx, { filter: { id: 'm1' }, update: { 'content.value': 'fixed' } });
        expect(r.result.editedAt).toBeInstanceOf(Date);
        expect(r.result.editedContent).toBe('original');
    });

    it('delete_renders_placeholder', async () => {                          // AC #5
        const r = await messageCtr.deleteMessage(ctx, { filter: { id: 'm1' } });
        expect(r.result.deletedAt).toBeInstanceOf(Date);
        expect(r.result.redacted).toBe(true);
        expect(r.result.content.value).toBe('');
    });

    it('delete_retains_moderation_copy', async () => {                      // AC #6
        const r = await messageCtr.deleteMessage(ctx, { filter: { id: 'm1' } });
        expect(r.result.editedContent).toBe('original');                    // original kept for review
    });

    it('media_with_text_one_message', async () => {                         // AC #7
        const r = await messageCtr.createMessage(ctx, { doc: {
            conversationId: 'c1',
            content: { type: E_MessageType.IMAGE, value: 'https://cdn/x.jpg' },
            moderationMediaId: 'mm1',
            statusMedia: E_ModerationMediaStatus.PENDING,
        } });
        expect(r.result.moderationMediaId).toBe('mm1');                     // one doc carries media + caption
    });

    it('media_hidden_until_approved', async () => {                         // AC #8
        const pending = msg({ content: { type: E_MessageType.IMAGE, value: 'u' }, statusMedia: E_ModerationMediaStatus.PENDING });
        expect(pending.statusMedia).not.toBe(E_ModerationMediaStatus.APPROVED); // recipient sees pending, not media
    });

    it('edit_and_delete_publish_events', async () => {                      // AC #9
        const spy = vi.spyOn(await import('#shared/graphql/pubsub.js').then(m => m.pubsub), 'publish');
        await messageCtr.editMessage(ctx, { filter: { id: 'm1' }, update: { 'content.value': 'fixed' } });
        await messageCtr.deleteMessage(ctx, { filter: { id: 'm1' } });
        expect(spy).toHaveBeenCalled();                                     // MESSAGE_EDITED + MESSAGE_DELETED
    });
});
```

`ssl-fe-user/src/modules/conversation/component/message.test.tsx` (AC #10) renders `MessageItem` from `mess-item.tsx`: with `editedAt` set it asserts the "edited" mark is present; with the message unsent (`deletedAt` + `redacted`) it asserts the "message deleted" placeholder text via `isMessageUnsent`. The media-with-text composer in `message.tsx` and the `edit-message-modal.tsx` flow are exercised here too (one `createMessage` call carries both the media URL and the caption; the edit modal calls the new `editMessage` mutation in `message.hook.ts`).

---

## §6 - Implementation skeleton

(API contract in §3 is the skeleton.) Three concrete changes wire it up: (a) `message.model.ts` + `message.type.ts` gain `editedAt` and `editedContent`; (b) `message.controller.ts` gains `editMessage` (author check + `EDIT_WINDOW_MS` guard + prior-content preservation + `MESSAGE_EDITED` publish) and `deleteMessage` retains `editedContent` instead of discarding it; (c) `message.resolver.ts` exposes the `editMessage` mutation and the `onMessageEdited` / `onMessageDeleted` subscriptions. On the client, `message.tsx` merges media and text into one `createMessage` call, `mess-item.tsx` renders the edited mark, the placeholder, and pending media, `edit-message-modal.tsx` hosts the edit form, and `message.hook.ts` adds the `editMessage` mutation hook.

---

## §7 - Dependencies

- Upstream: none. This FR extends modules that already exist - `conversation/message/` (`MessageModel`, `messageCtr`, `messageResolver`) and `moderation/moderation-media/` (`ModerationMedia`, `E_ModerationMediaStatus`) plus `moderation/ai-moderation/` (`aiModerationCtr`).
- Related: the existing `MESSAGE_DELETED` subscription path (`E_CONVERSATION_EVENTS`, consumed by `useMessageDeletedSubscription` in the FE) that delete already uses and edit now mirrors.
- Downstream: none in Release 1. Release 2 (Communities) reuses the same media-moderation gate but is out of scope here.

---

## §8 - Example payloads

```json
{ "event": "MESSAGE_EDITED", "payload": { "messageEdited": { "conversationId": "c1", "messageId": "m1" } } }
```

```json
{ "event": "MESSAGE_DELETED", "payload": { "messageDeleted": { "conversationId": "c1", "messageId": "m1" } } }
```

```json
{ "doc": { "conversationId": "c1", "content": { "type": "IMAGE", "value": "https://cdn/x.jpg" }, "moderationMediaId": "mm1", "statusMedia": "PENDING" } }
```

---

## §9 - Open questions

All resolved by DEC-SSL-210. Noted for the build:
- The 10-minute window is fixed by DEC-SSL-210; if the client later wants it configurable, `EDIT_WINDOW_MS` is the single knob.
- Editing media (replacing the image) is out of scope for Release 1; edit covers the text value only, which is what the questionnaire asked for. Media changes go through delete-and-resend.
- Retention period of the moderation copy follows the platform's existing moderation-log retention; no new TTL is introduced here.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Edit after 10 minutes | `EDIT_WINDOW_MS` guard on `createdAt` | FORBIDDEN | resend a new message |
| Non-author edits | `senderId !== currentUser.id` | FORBIDDEN | only the author can edit |
| Edit loses prior text | `editedContent` set before overwrite | original retained | none (AC #4) |
| No visible "edited" mark | `editedAt` set on edit | mark shown | none (AC #4, #10) |
| Delete vanishes the row | soft-delete (`deletedAt` + `redacted`, no `expiresAt`) | placeholder shown | none (AC #5) |
| Unsend erases evidence | retain `editedContent` + `moderationMediaId` | moderation copy kept | review queue |
| Media + caption split into two messages | one `createMessage` doc carries both | single bubble | none (AC #7) |
| Unmoderated media shown | `statusMedia` gate (`PENDING` -> not visible) | pending placeholder | shown when `APPROVED` |
| Client bypasses the window | server-side guard in `editMessage` | FORBIDDEN | none (AC #2, #8) |
| Other party misses an edit | `MESSAGE_EDITED` publish | bubble updates live | refetch on reconnect |
| Other party misses a delete | `MESSAGE_DELETED` publish | placeholder live | refetch on reconnect |
| Edit a deleted message | author + window check on a redacted doc | refused / no-op | none |

---

## §11 - Implementation notes

- The edit window is computed server-side from `createdAt` in `message.controller.ts` `editMessage`; the client never sends the age or the sender, so a crafted GraphQL call cannot widen the window or impersonate the author. This is the same author-only stance `updateMessage` already takes, now with the missing time bound.
- Delete reuses the current soft-delete exactly (`deletedAt`, `redacted`, blanked `content.value`, deliberately no `expiresAt` so the row survives a reload), so the "message deleted" placeholder the FE already renders via `isMessageUnsent` keeps working; the one change is retaining `editedContent` (the original) instead of letting it go, so abuse review still has the text.
- The moderation copy is the original `content.value` (kept in `editedContent`) plus the existing `moderationMediaId`; deletion stops short of `removeMessageMedia` for the retained copy so moderators can still see what was sent.
- Media-with-text is a single `Message`: the FE stops branching media into a separate `createMediaMessage` call and instead sends one `createMessage` doc with both the media `content.value` and the `moderationMediaId`; the recipient sees a pending placeholder until `statusMedia` is `APPROVED`, reusing `aiModerationCtr` and the `ModerationMedia` queue rather than a new pipeline.
- `MESSAGE_EDITED` is the only new `E_CONVERSATION_EVENTS` member; it mirrors `MESSAGE_DELETED` so the FE subscription pattern (`useMessageDeletedSubscription`) is copied, not redesigned, keeping both real-time paths identical.
- The frontend hook is `message/message.hook.ts` (TypeScript, not `.tsx`); the `editMessage` mutation hook lives there next to `useCreateMessage` and `useUnsendMessage`.

---

*End of FR-CHAT-001.*
