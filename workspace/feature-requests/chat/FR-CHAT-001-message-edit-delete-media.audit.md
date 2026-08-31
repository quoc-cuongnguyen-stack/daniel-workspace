---
fr_id: FR-CHAT-001
audited: 2026-06-29
verdict: PASS
score_pre_revision: 9.5/10
score_post_revision: 9.5/10
issues_resolved: 0
template: engineering-spec@1
rubric: audit_rubric@2.0 (engineering-spec scope - structure/traceability/quality spirit, per FR-CLICK-013 precedent)
---

## §1 - Verdict summary

FR-CHAT-001 specifies the three locked DEC-SSL-210 chat changes: a server-enforced 10-minute author-only edit window with an "edited" mark and preserved prior text, a soft-delete placeholder that retains a moderation copy, and a single message that carries media together with text gated on `ModerationMedia` APPROVED. Scope: 9 §1 normative clauses (edit window + author-only, editedAt/editedContent + mark, delete placeholder, retained moderation copy, media-with-text single doc, APPROVED media gate, real-time MESSAGE_EDITED/MESSAGE_DELETED, server-side enforcement, SHOULD reuse the existing soft-delete path). 7 §2 rationale paragraphs grounded in the current `message.controller.ts`/`message.tsx` behaviour. §3 carries the type additions, model fields, the full `editMessage` controller, the resolver mutation + subscriptions, and the new enum member. 10 §4 ACs. §5 has a 9-case backend Vitest file (`message-edit.test.ts`) plus the `message.test.tsx` frontend note (AC #10). §10 lists 12 failure rows; §11 lists 6 notes.

Frontmatter is complete against the FR-CLICK-013 engineering-spec key set; all 11 sections present and non-empty; `status` was a valid `draft`, flipped to `ready_to_implement` on this PASS.

## §2 - Findings

No blocking issues. Verification of each gate:

- **TRACE-001 (every §1 MUST cited by >=1 §4 AC):** PASS. #1->AC1+AC2+AC3; #2->AC4; #3->AC5; #4->AC6; #5->AC7; #6->AC8; #7->AC9; #8->AC2+AC3+AC8 (server enforcement asserted via the window/author/APPROVED refusals); SHOULD clause #9 is cited by AC5. Every MUST clause is traced.
- **TRACE-002 (every §4 AC cites >=1 §5 test):** PASS. AC1-9 each cite a named test in `message-edit.test.ts` (`edit_within_window`, `edit_refused_after_window`, `edit_refused_non_author`, `edit_sets_mark_and_prior`, `delete_renders_placeholder`, `delete_retains_moderation_copy`, `media_with_text_one_message`, `media_hidden_until_approved`, `edit_and_delete_publish_events`). AC10 cites the `message.test.tsx` frontend note, which is acceptable for a render-only UI assertion and is justified (the edited mark / placeholder render via `isMessageUnsent`).
- **TRACE-003 (every §5 test path in new_files or on disk):** PASS. `message-edit.test.ts` and `message.test.tsx` are both in frontmatter `new_files`. The modules they exercise were verified on disk: `message.controller.ts` (holds the current `updateMessage`/`deleteMessage`/`createMessage`), `E_ModerationMediaStatus` (`ssl-be/src/modules/moderation/moderation-media/moderation-media.type.ts`), `E_CONVERSATION_EVENTS` + `pubsub` (`conversation/conversation.type.ts`, `message.controller.ts`), and on the FE `isMessageUnsent`/`createMediaMessage` (`ssl-fe-user/src/modules/conversation/component/mess-item.tsx`, `message.tsx`).
- **QA-006 (scope boundaries):** PASS. §9 scopes out media-replacement editing (delete-and-resend) and leaves the window/retention knobs explicit; `disallowed_tools` forbids editing by a non-author or past the window and forbids showing media before APPROVED.
- **QA-005 (alternatives):** PASS in spirit. §2 weighs each design against the current behaviour it replaces (untimed edit, two-bubble media, overloading MESSAGE_SENT).
- **QA-004/QA-007 (vanity / unsourced metric):** PASS. No vanity metric; the one quantitative value (10 minutes) traces to DEC-SSL-210 and is a single named constant (`EDIT_WINDOW_MS`).
- **Plain-keyboard scan:** PASS. No curly quotes, em/en dashes, ellipsis characters, or non-breaking/zero-width spaces.

## §3 - Resolution

Clean on first audit; no mechanical fixes required. This FR is unusually well-anchored because it cites the exact existing functions it extends (`updateMessage`, the soft-delete fields, the `createMediaMessage` branch), and every reuse target resolved on disk. **Score = 9.5/10.** The 0.5 reflects that AC #10's frontend assertion is a prose note rather than a named test function (acceptable under TRACE-002 for render-only UI, and the backend nine are fully named); not worth a revision. Ready to ship; FR `status` set to `ready_to_implement`.

---

*End of FR-CHAT-001 audit.*
