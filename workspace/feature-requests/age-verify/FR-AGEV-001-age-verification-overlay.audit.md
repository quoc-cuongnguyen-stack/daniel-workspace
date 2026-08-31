---
fr_id: FR-AGEV-001
audited: 2026-06-29
verdict: PASS (after revision)
score_pre_revision: 8.5/10
score_post_revision: 9.5/10
issues_resolved: 1
template: engineering-spec@1
rubric: audit_rubric@2.0 (engineering-spec scope - structure/traceability/quality spirit, per FR-CLICK-013 precedent)
---

## §1 - Verdict summary

FR-AGEV-001 specifies the age-verification status overlay on already-blurred media: a ghost + "18?" SVG glyph, a "This profile is not age verified" banner, an owner-only "Verify Age" CTA, and two derived read-only flags (`isAgeVerified`, `ageVerifyStatus`) on `T_User`. It is a read-and-render feature that explicitly scopes the AI age-detection pipeline out. Scope: 9 §1 normative clauses (overlay on blurred media via SVG, banner on profile, owner-only CTA + visitor explanation-only, i18n strings + language-neutral glyph, expose the two flags, never-unblur, consistent on cards + profile, no AI inference, SHOULD accessibility) plus a §1 note re-stating the AI-out-of-scope boundary. 5 §2 rationale paragraphs. §3 carries the GraphQL/type additions, the `presentUser` derivation, the `AgeVerifyOverlay` component, and the i18n namespace. 9 §4 ACs. §5 has an 8-case overlay test (`age-verify-overlay.test.tsx`), a presenter test (`user.presenter.test.ts`), and the cross-surface note (AC #9). §10 lists 12 failure rows; §11 lists 5 notes. Maps to DEC-SSL-230.

The §1 #8 + §1 note correctly defuse QA-001/QA-002/QA-003 (the EU-AI-Act / biometric heuristics): the FR runs no inference, reads one precomputed boolean, and names the existing AI pipeline as out of scope, so it must not be classified as an AI or biometric feature. Frontmatter is complete against the FR-CLICK-013 engineering-spec key set; all 11 sections present and non-empty. `status` was a valid `draft`; flipped to `ready_to_implement` after the one revision below.

## §2 - Findings

### ISS-001 - §5 presenter test path missing from frontmatter new_files (TRACE-003)
§5 declares a backend test `ssl-be/src/modules/user/user.presenter.test.ts` covering AC #7 (`presents_is_age_verified`), but that path was absent from frontmatter `new_files`, and the file does not exist on disk (a filesystem check found only `user-read-location-filter.test.ts` and `user-read.policy.test.ts` in that directory; `user.presenter.ts` itself exists and is where the derivation lands). Under TRACE-003 a §5 test path must be either declared in `new_files` or resolve on disk; this one was neither, so the reference dangled.

Resolved (cheap fix): added `ssl-be/src/modules/user/user.presenter.test.ts` to frontmatter `new_files`. It is now a declared test file that will be authored during implementation alongside the `presentUser` change, exactly as the gold FR-CLICK-013 treats its own new test files. No human decision needed.

Other gates (all PASS):

- **TRACE-001 (every §1 MUST cited by >=1 §4 AC):** PASS. #1->AC1; #2->AC2; #3->AC3+AC4; #4->AC5+AC6; #5->AC7; #6->AC8; #7->AC9; #8->AC8. SHOULD clause #9 (accessibility / no-tap-block) is left untraced, which the gold FR permits for SHOULD clauses (it is still covered operationally by §10 and §11). Every MUST is traced.
- **TRACE-002 (every §4 AC cites >=1 §5 test):** PASS. AC1-6 and AC8 cite named functions in `age-verify-overlay.test.tsx` (`renders_overlay_on_non_verified`, `banner_shown_owner_and_visitor`, `owner_sees_cta_invokes_verify`, `visitor_no_cta`, `strings_from_i18n`, `icon_is_language_neutral`, `overlay_does_not_unblur`); AC7 cites `presents_is_age_verified` in the presenter test; AC9 cites the cross-surface render note (acceptable, justified for a mount-consistency check across two existing components).
- **TRACE-003 (every §5 test path in new_files or on disk):** PASS post-fix. `age-verify-overlay.test.tsx`, `user.presenter.test.ts` (added), and the SVG asset are all in `new_files`. Reused symbols verified on disk: `presentUser` + `isOnline` (`user.presenter.ts`), `signProfileImage`/`hydrateUserMedia` (`user.validate.ts`), `E_AgeVerifyStatus`/`I_AgeVerify` (`authn.type.ts`, `authn.controller.ts`), and `MembershipPopup` as the CTA-pattern reference (`membership-popup.tsx`).
- **QA-006 (scope boundaries):** PASS. §1 #8 + the §1 note + §7 "Out of scope" + `disallowed_tools` (no blur-logic change, no AI inference, no glyph translation) bound the feature tightly.
- **QA-005 (alternatives):** PASS in spirit. §2 argues SVG-vs-PNG, read-only-flag-vs-client-re-derivation, and owner-only-vs-universal CTA.
- **QA-001/002/003 (AI-Act heuristics):** PASS. Although the codebase does run AI age detection, the FR reads one derived boolean and renders UI; §1 #8 and the §1 note state the boundary explicitly, so the dodged-risk-class and high-risk-indicator heuristics do not fire. No biometric obligation attaches to a banner + SVG + boolean.
- **Plain-keyboard scan:** PASS. No curly quotes, em/en dashes, ellipsis characters, or non-breaking/zero-width spaces.

## §3 - Resolution

One TRACE-003 gap found and fixed in-place (the presenter test path added to `new_files`). No `needs_human` issue remains. **Score = 9.5/10.** The 0.5 reflects that the final multilingual `banner`/`cta-verify` wording is supplied by the client (DEC-SSL-230) and the exact owner verify-flow entry point is wired at implementation time - both correctly parked in §9 as product/integration decisions, not spec defects. Ready to ship; FR `status` set to `ready_to_implement`.

---

*End of FR-AGEV-001 audit.*
