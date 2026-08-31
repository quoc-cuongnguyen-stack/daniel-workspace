# SSL (SecretSwingerLust) - round-1 feature request backlog

Owner: Stephen Cheng (CyberSkill) - Status: v1.0 backlog authored 2026-06-29 from the client's locked requirements, the proposal/SOW, and a full read of the three platform repos (ssl-be, ssl-fe-user, ssl-fe-admin), via the CyberOS feature-request-author + feature-request-audit workflow.

Source of truth: the markdown FR files under the module folders. This index is a derived view. Decisions the FRs trace to are in `DECISIONS.md`.

Authoring playbook: CyberOS `feature-request-author` + `feature-request-audit` (engineering-spec FRs with §1 normative MUST clauses traced to §4 acceptance criteria and §5 tests; audit loop to a passing score).

---

## Headline metrics

| Metric | Value |
|---|---:|
| FRs authored | 8 |
| Release 1 (quick wins) FRs | 4 |
| Release 2 (Communities MVP) FRs | 4 |
| Estimated engineering hours | ~146h (R1 ~58h, R2 ~88h) |
| Repos touched | ssl-be (GraphQL + MongoDB), ssl-fe-user (Next.js 16), ssl-fe-admin (React Router 7) |
| In-scope client features covered | 5 of 5 |

Hours are reuse-aware estimates for the in-scope MVP slices, not the full proposal scope; they firm up per FR at implementation.

## Modules

| Module | FRs | Hours | Release | What it covers |
|---|---:|---:|---|---|
| VISIT | 1 | 20 | R1 | Profile Visit Center: who-viewed-me, 30-day records, eye-icon nav with unread badge, freemium teaser (blur visitor name+photo for non-payers, click to upgrade CTA), incognito with reciprocity, filter by profile type. |
| CHAT | 1 | 16 | R1 | Chat improvements: edit within 10 minutes (with an edited mark), delete with a "message deleted" placeholder and a retained moderation copy, and media sent together with text. |
| GUEST | 1 | 12 | R1 | On-profile guestbook: read by all, write and reply restricted to paying members, owner removes entries, server-enforced. |
| AGEV | 1 | 10 | R1 | Age-verification overlay: the ghost + "18?" overlay on blurred media, a "This profile is not age verified" banner, and a Verify Age CTA for the owner; exposes isAgeVerified; no AI inference. |
| COMM | 4 | 88 | R2 | Communities / Forum MVP: core (create/join/leave, search), feed (posts, comments, reactions, media moderation), members + online indicator + bell notifications, and the admin tags + post-moderation surfaces. |

## Feature requests

| FR | Title | Module | Release | Hours | Depends on |
|---|---|---|---|---:|---|
| FR-VISIT-001 | Profile Visit Center - who-viewed-me, freemium teaser, incognito | VISIT | R1 | 20 | - |
| FR-CHAT-001 | Chat: edit (10 min), delete with placeholder, media with text | CHAT | R1 | 16 | - |
| FR-GUEST-001 | Guestbook: paid-member write/reply gating + owner moderation | GUEST | R1 | 12 | - |
| FR-AGEV-001 | Age-verification status overlay on blurred media | AGEV | R1 | 10 | - |
| FR-COMM-001 | Communities core: create/join/leave, My Communities, search | COMM | R2 | 28 | - |
| FR-COMM-002 | Community feed: posts, comments, reactions, media moderation | COMM | R2 | 30 | FR-COMM-001 |
| FR-COMM-003 | Community members, online indicator, bell notifications | COMM | R2 | 14 | FR-COMM-001, FR-COMM-002 |
| FR-COMM-004 | Community admin: tags + post moderation surfaces | COMM | R2 | 16 | FR-COMM-001, FR-COMM-002 |

## Phasing (aligned to SOW03)

- Release 1 - quick wins (build weeks 1-5, go-live about week 5-6): FR-VISIT-001, FR-CHAT-001, FR-GUEST-001, FR-AGEV-001.
- Release 2 - Communities MVP (build weeks 3-9, go-live about week 10): FR-COMM-001 -> 002 -> 003 / 004.
- Phase 2 - deferred, separate quote (DEC-SSL-246): community map (MapTiler), private communities with application + approval, activity points, premade themes with the step-based builder, and the full in-community admin panel. These are explicitly out of scope and are named as non-goals inside the relevant FRs.

## Cross-cutting prerequisites and notes

- Two small backend enum additions are needed for Communities and surfaced by the FRs: `E_UploadEntity.COMMUNITY` (so post/header media route into the existing ModerationMedia queue) and `E_TagType.COMMUNITY` (so curated community tags coexist with user tags). Add these alongside FR-COMM-001 / FR-COMM-004.
- The guestbook and the whole community module are greenfield in ssl-be; the other R1 features extend existing modules (user, conversation/message, user.ageVerify + Bunny blur).
- Reused platform mechanisms, not rebuilt: `authnCtr.isPaidMember()` for all paid gating, `ModerationMedia` + the AI moderation queue for all new media, the `Notification` model + IN_APP bell for new events, the Bunny blur path for age-verify, and next-intl for all new copy.
- Client to deliver: the final multilingual wording for the age-verify banner and Verify Age CTA (FR-AGEV-001); the "18?" icon is language-neutral. The supplied SVG asset ships as `ssl-fe-user/public/age-verify/not-age-verified.svg`.

## Status flow

`draft -> ready_to_implement -> implementing -> ready_to_review -> reviewing -> ready_to_test -> testing -> done` (with `on_hold` / `closed` off-ramps). All 8 FRs are authored at `draft` and move to `ready_to_implement` once each passes its audit.

## Next steps

1. Run `feature-request-audit` across the 8 FRs (the `.audit.md` files), fix any blocking issues, and flip passing FRs to `ready_to_implement`.
2. Confirm the age-verify multilingual copy with the client before FR-AGEV-001 ships.
3. Build Release 1 first (the four quick wins), in any order since they are independent; then Release 2 in dependency order FR-COMM-001 -> 002 -> 003 / 004.

---

See `DECISIONS.md` for the DEC-SSL source decisions and each module folder for the FR files and their `.audit.md` reports.
