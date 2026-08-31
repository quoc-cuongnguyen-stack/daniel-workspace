---
fr_id: FR-VISIT-001
audited: 2026-06-29
verdict: PASS
score_pre_revision: 9.5/10
score_post_revision: 9.5/10
issues_resolved: 0
template: engineering-spec@1
rubric: audit_rubric@2.0 (engineering-spec scope - structure/traceability/quality spirit, per FR-CLICK-013 precedent)
---

## §1 - Verdict summary

FR-VISIT-001 specifies the Profile Visit Center: a who-viewed-me list with a server-side freemium teaser, incognito reciprocity, a 30-day TTL, and an unread badge. Scope: 12 §1 normative clauses (full-profile-only recording, dedupe upsert, 30-day TTL, self/blocked/suspended skip, unread badge + retained per-entry read state, list shape + newest-first order, server-side teaser gate, incognito reciprocity, delete one/all + reappear, remembered type filter, GraphQL surface + audit/notification, SHOULD reuse the shared hydration path). 6 §2 rationale paragraphs. §3 carries the Mongo model (unique compound index + recent index + TTL index), the resolver, and the controller shapes with the server-side teaser spelled out. 12 §4 ACs. §5 has 12 backend Vitest cases (`profile-visit.test.ts`) plus 3 frontend cases (`visitor.test.tsx`). §10 lists 14 failure rows; §11 lists 6 notes. Maps to DEC-SSL-201..205 and questionnaire P3.

Frontmatter is complete against the FR-CLICK-013 engineering-spec key set (id, title, module, priority, status, verify, phase, milestone, slice, owner, created, related_frs, depends_on, blocks, source_pages, source_decisions, language, service, new_files, modified_files, allowed_tools, disallowed_tools, effort_hours, sub_tasks, risk_if_skipped). All 11 sections (§1-§11) present and non-empty. `status` was a valid `draft`; flipped to `ready_to_implement` on this PASS.

## §2 - Findings

No blocking issues. Verification of each gate:

- **TRACE-001 (every §1 MUST cited by >=1 §4 AC):** PASS. #1->AC1; #2->AC2; #3->AC3; #4->AC4; #5->AC5; #6->AC6; #7->AC7+AC8; #8->AC9; #9->AC10; #10->AC11; #11->AC12. SHOULD clause #12 is cited by AC7 (citation not required for SHOULD). Every MUST clause is traced.
- **TRACE-002 (every §4 AC cites >=1 §5 test):** PASS. Each AC names a concrete test function (`records_only_on_full_profile_open`, `dedupes_and_updates_last_visited`, `sets_and_refreshes_ttl_expiry`, `skips_self_blocked_suspended`, `unread_count_reflects_readAt` + `clears_unread_badge_on_open`, `lists_each_visitor_once_newest_first`, `free_owner_gets_blurred_no_clear_identity` + `blurred_visitor_click_opens_membership_popup`, `paid_owner_gets_clear_identity`, `incognito_hides_and_reciprocally_blocks`, `delete_one_all_and_reappear`, `filters_by_profile_type` + `remembers_last_filter`, `notifies_only_on_first_visit`).
- **TRACE-003 (every §5 test path in new_files or on disk):** PASS. `profile-visit.test.ts` and `visitor.test.tsx` are both declared in frontmatter `new_files` and will be authored during implementation. The reused symbols the tests lean on were verified on disk: `authnCtr.isPaidMember` (`ssl-be/src/modules/authn/authn.controller.ts`), `signProfileImage`/`hydrateUserMedia` (`ssl-be/src/modules/user/user.validate.ts`), `NotificationModel` (`ssl-be/src/modules/notification/notification.model.ts`), and the TTL idiom in `message.model.ts`.
- **QA-006 (scope boundaries):** PASS. §9 Open questions plus the `disallowed_tools` list bound the feature (no clear identity to a non-payer, no recording from map/search/preview, no visitor view while incognito). `risk_if_skipped` is specific and per-clause.
- **QA-005 (alternatives):** PASS in spirit. §2 argues the design against the rejected alternatives inline (UI-only blur vs server gate; log-of-loads vs set; cron vs TTL index).
- **QA-004/QA-007 (vanity / unsourced metric):** PASS. No vanity-only metric; the success surface is functional ACs, and the one quantitative value (30-day window) traces to DEC-SSL-203.
- **Plain-keyboard scan:** PASS. No curly quotes, em/en dashes, ellipsis characters, or non-breaking/zero-width spaces. The `->` arrows are plain ASCII.

## §3 - Resolution

Clean on first audit. No mechanical fixes were required and no `auditCtr`-style dangling symbol exists here (the notification path uses the real `NotificationModel`, verified on disk). **Score = 9.5/10.** The 0.5 held back only reflects that the masked-name copy and the per-session-vs-sticky incognito choice are deferred to the client in §9 (genuine product decisions, correctly parked, not spec defects). Ready to ship; FR `status` set to `ready_to_implement`.

---

*End of FR-VISIT-001 audit.*
