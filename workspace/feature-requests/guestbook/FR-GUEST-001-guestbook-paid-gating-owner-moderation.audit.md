---
fr_id: FR-GUEST-001
audited: 2026-06-29
verdict: PASS (after revision)
score_pre_revision: 8.5/10
score_post_revision: 9.5/10
issues_resolved: 1
template: engineering-spec@1
rubric: audit_rubric@2.0 (engineering-spec scope - structure/traceability/quality spirit, per FR-CLICK-013 precedent)
---

## §1 - Verdict summary

FR-GUEST-001 specifies a greenfield on-profile guestbook module: public read at the bottom of every profile, paid-only write and reply, owner-or-author soft-delete moderation, threaded replies, writer-avatar hydration, and a per-mutation audit line, all enforced server-side. Scope: 7 §1 normative clauses (public read, paid-gated write, paid-gated reply, owner-or-author soft-delete + read filter, server-side enforcement of all three controls, threaded replies + writer hydration, per-mutation audit line + SHOULD reuse soft-delete conventions). 6 §2 rationale paragraphs. §3 carries the Mongo model, the full controller (`listEntries`/`writeEntry`/`replyEntry`/`removeEntry` with the `isPaidMember` gate and owner-or-author check), and the thin resolver. 11 §4 ACs. §5 has an 11-case backend Vitest file (`guestbook.test.ts`) plus the `guest-book.test.tsx` composer-vs-CTA note. §10 lists 15 failure rows; §11 lists 8 notes. Maps to DEC-SSL-220 and questionnaire P2 Q5.

Frontmatter is complete against the FR-CLICK-013 engineering-spec key set; all 11 sections present and non-empty. `status` was a valid `draft`; flipped to `ready_to_implement` after the one revision below.

## §2 - Findings

### ISS-001 - Audit clause named a non-existent `auditCtr.emit` sink (TRACE-003 soundness)
§1 #7 required each mutation to "emit an audit line", AC #11 asserted it, and the §5 test `mutations_emit_audit` spied on `vi.spyOn(auditCtr, 'emit')`. A filesystem sweep of `ssl-be/src` found **no `auditCtr` symbol anywhere** - the platform has no central audit controller; structured logging is done through the `log` utility from `@cyberskill/shared/node/log` (verified in use across `moderation-media.controller.ts`, the AI-moderation providers, and elsewhere). As written, the audit MUST and its test referenced a dependency that does not exist, so the clause was not implementable as named.

Resolved (cheap fix, all in-FR): re-anchored §1 #7 to the real `log` utility, requiring a structured line with a stable `kind` (`guestbook.entry_written` / `guestbook.entry_replied` / `guestbook.entry_removed`) plus ids; updated AC #11 to match ("a structured `log` line whose `kind` is..."); changed the §5 spy from `auditCtr.emit` to `log.info` and added `import { log } from '@cyberskill/shared/node/log'` to the test block. The trust-and-safety intent of the clause is preserved; only the mechanism now points at what the codebase actually provides. No human decision needed - the platform's logging primitive is unambiguous.

Other gates (all PASS):

- **TRACE-001 (every §1 MUST cited by >=1 §4 AC):** PASS. #1->AC1; #2->AC2+AC3+AC9; #3->AC4+AC9; #4->AC5+AC6+AC7+AC8; #5->AC3+AC4+AC7; #6->AC4+AC10; #7->AC11. SHOULD (reuse soft-delete) within #7 needs no citation. Every MUST is traced.
- **TRACE-002 (every §4 AC cites >=1 §5 test):** PASS. AC1-8, 10, 11 cite named functions in `guestbook.test.ts` (`read_is_public`, `paid_member_can_write`, `free_member_write_rejected`, `reply_is_paid_gated`, `owner_removes_any_entry`, `author_removes_own_entry`, `stranger_remove_rejected`, `deleted_excluded_from_reads`, `writer_media_hydrated`, `mutations_emit_audit`); AC9 cites the `guest-book.test.tsx` composer-vs-CTA note (acceptable render-only UI assertion, justified).
- **TRACE-003 (every §5 test path in new_files or on disk):** PASS post-fix. `guestbook.test.ts` and `guest-book.test.tsx` are in frontmatter `new_files`. Reused symbols verified on disk: `authnCtr.isPaidMember`/`getUserFromSession` (`authn.controller.ts`), `hydrateUserMedia`/`getViewerMediaContext` (`user.validate.ts`), `MembershipPopup` (`ssl-fe-user/.../membership/membership-popup.tsx`), `confirmation.tsx`, and the now-corrected `log` utility. The `guestbook` module is correctly absent (greenfield, declared in `new_files`).
- **QA-006 (scope boundaries):** PASS. §9 scopes out reply pagination, entry editing, and owner-notification; `disallowed_tools` forbids a non-paying write/reply and a remove by a non-owner-non-author.
- **QA-005 (alternatives):** PASS in spirit. §2 argues the first-class module against reusing conversation/message and `isPaidMember` against a hand-rolled role check.
- **QA-004/QA-007:** PASS. No vanity or unsourced metric; the surface is functional ACs.
- **Plain-keyboard scan:** PASS. No curly quotes, em/en dashes, ellipsis characters, or non-breaking/zero-width spaces (re-scanned after the edits).

## §3 - Resolution

One soundness gap found and fixed in-place (the fictional `auditCtr` re-pointed to the platform's real `log` utility across §1 #7, AC #11, and the §5 test). No `needs_human` issue remains; the audit-sink choice was mechanical given what exists in the codebase. **Score = 9.5/10.** The 0.5 reflects that audit-emit lines in the §3 controller body are still shown as `// emit guestbook.entry_* (§1 #7)` comments rather than concrete `log` calls - intentional for a skeleton, and consistent with FR-CLICK-013 leaving controller bodies as shapes. Ready to ship; FR `status` set to `ready_to_implement`.

---

*End of FR-GUEST-001 audit.*
