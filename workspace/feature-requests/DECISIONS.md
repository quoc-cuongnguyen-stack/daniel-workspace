# SSL round-1 - source decisions

These DEC-SSL entries are the locked client decisions that the FRs trace to. Source of truth: the client's returned requirements questionnaire (`docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx`, returned 2026-06), the proposal (`docs/SSL_NewFeatures_Proposal_Quotation_L4.docx`), the budget-aligned scope (`docs/SSL_NewFeatures_BudgetScope_R1_L4.docx`), the signed SOW (`docs/Outsource - ElevenX - CyberSkill - SOW03 - SSL New Features (rev CyberSkill).docx`), the age-verify design asset (`docs uploads: Not age verified.svg / Not ageverified badge.pdf`), and the payment chat (2026-06-29).

## Profile Visit Center (questionnaire P3)

- DEC-SSL-201 - Freemium teaser, not a hard gate. Non-paying users see that someone visited, but the visitor's name and photo are blurred; clicking a blurred visitor opens an upgrade CTA. Paying members see full visitor info. (P3 Q2)
- DEC-SSL-202 - A visit counts only when the full profile is opened, not from map pins or search cards. (P3 Q4)
- DEC-SSL-203 - Visitor records are stored for 30 days. (P3 Q1)
- DEC-SSL-204 - Incognito browsing is allowed, with reciprocity: if a user hides their own visits, they cannot see who visited them. (P3 Q3)
- DEC-SSL-205 - The unread badge is cleared when the center is opened; per-entry read state is retained. (P3 Q5)

## Chat improvements (questionnaire P2)

- DEC-SSL-210 - Chat: a 10-minute edit window; a deleted message shows a "message deleted" placeholder; edited messages show an "edited" mark; a message may carry media together with text. (P2 Q4)

## Guestbook (questionnaire P2)

- DEC-SSL-220 - The guestbook at the bottom of every profile restricts writing and replying to paying members; non-members can still read; the profile owner can remove entries on their own guestbook. (P2 Q5)

## Age-verification overlay (questionnaire P2 + design asset)

- DEC-SSL-230 - On non-age-verified profiles the blurred media carries the supplied overlay (a ghost icon, white at 50% opacity, with "18?" white at 100%) centered semi-transparent, plus a banner "This profile is not age verified" and a direct "Verify Age" action. The owner sees the actionable Verify Age CTA routing to the existing verification flow; visitors see explanation only. The client provides the final multilingual wording; the "18?" icon is language-neutral. The underlying AI age-detection system is existing and out of scope for this FR. (P2 Q6 + Daria asset 2026-06-29)

## Communities / Forum MVP (questionnaire P1)

- DEC-SSL-240 - Membership gating: a user must be a paying member to create a community or to post/comment; everyone can join an open community unless it is private. (P1 Q7)
- DEC-SSL-241 - Map provider is MapTiler (matches the rest of the platform). The community map is Phase 2, deferred. (P1 Q2)
- DEC-SSL-242 - Posts auto-delete 12 months from creation; no GDPR retention duty applies. (P1 Q6)
- DEC-SSL-243 - v1 search is by community name plus tags plus location; searching inside posts is later. (P1 Q8)
- DEC-SSL-244 - Media limits reuse the platform's existing gallery limits. (P1 Q9)
- DEC-SSL-245 - Communities are multilingual, reusing the existing i18n. (P1 Q10)
- DEC-SSL-246 - Phase 2 (out of scope this round, separate quote): community map (MapTiler), private communities with application + moderator approval, activity points, premade themes with the step-based builder, and the full in-community admin panel. (proposal + SOW exclusions)

## Commercial framing (SOW03)

- DEC-SSL-250 - Release order: Release 1 = the four quick wins (Profile Visit Center, chat, guestbook, age-verify overlay); Release 2 = Communities MVP. Build window 2026-07-01 to 2026-09-16. Payment 50/50 (50% after Release 1 UAT, 50% after completion). (SOW03 + chat 2026-06-29)
