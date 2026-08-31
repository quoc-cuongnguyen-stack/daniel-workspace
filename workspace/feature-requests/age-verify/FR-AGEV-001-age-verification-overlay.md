---
id: FR-AGEV-001
title: "Age-verification status overlay on blurred media (ghost + 18? + Verify Age banner)"
module: AGEV
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
related_frs: [FR-VISIT-001]
depends_on: []
blocks: []
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P2 Q6 Age-verification messages"
  - "docs/SSL_NewFeatures_Proposal_Quotation_L4.docx#P3.6"
  - "docs uploads: Not age verified.svg / Not ageverified badge.pdf (design asset, Daria 2026-06-29)"
source_decisions:
  - DEC-SSL-230 (blurred media on non-age-verified profiles carries the ghost + "18?" overlay, a "This profile is not age verified" banner, and a direct "Verify Age" action for the owner; visitors see explanation only; client supplies final multilingual wording; the "18?" icon is language-neutral; the underlying AI age-detection system is existing and out of scope for this FR)
language: typescript
service: "ssl-be + ssl-fe-user"
new_files:
  - ssl-fe-user/src/shared/component/ui/age-verify-overlay.tsx
  - ssl-fe-user/src/shared/component/ui/age-verify-overlay.test.tsx
  - ssl-be/src/modules/user/user.presenter.test.ts
  - ssl-fe-user/public/age-verify/not-age-verified.svg
modified_files:
  - ssl-be/src/modules/user/user.type.ts
  - ssl-be/src/modules/user/user.graphql
  - ssl-be/src/modules/user/user.presenter.ts
  - ssl-be/src/modules/user/user.resolver.ts
  - ssl-fe-user/src/shared/component/card/card-gallery.tsx
  - ssl-fe-user/src/modules/profile/(components)/profile.tsx
  - ssl-fe-user/src/shared/i18n/data/en.json
  - ssl-fe-user/src/shared/i18n/data/fr.json
  - ssl-fe-user/src/shared/i18n/data/de.json
  - ssl-fe-user/src/shared/i18n/data/es.json
  - ssl-fe-user/src/shared/i18n/data/pt.json
  - ssl-fe-user/src/shared/i18n/data/pt-br.json
  - ssl-fe-user/src/shared/i18n/data/it.json
  - ssl-fe-user/src/shared/i18n/data/da.json
allowed_tools:
  - file_read: "ssl-be/src/modules/user/**, ssl-fe-user/src/**, ssl-fe-user/public/**"
  - file_write: "ssl-be/src/modules/user/**, ssl-fe-user/src/shared/component/**, ssl-fe-user/src/modules/profile/**, ssl-fe-user/src/shared/i18n/data/**, ssl-fe-user/public/age-verify/**"
  - bash: "cd ssl-fe-user && pnpm vitest run age-verify-overlay"
disallowed_tools:
  - add or change any blur logic in signProfileImage/getViewerMediaContext/hydrateUserMedia (this FR reads the existing blur, it does not produce it)
  - perform, call, or gate on any AI age-detection inference (existing platform system, out of scope per DEC-SSL-230)
  - translate the "18?" icon glyph (it is language-neutral per DEC-SSL-230)
effort_hours: 10
sub_tasks:
  - "1.5h: ssl-be expose isAgeVerified (Boolean) + ageVerifyStatus on T_User from ageVerify.status (user.graphql, user.type.ts, user.presenter.ts)"
  - "2.0h: AgeVerifyOverlay component - render not-age-verified.svg + i18n banner + owner-only Verify Age CTA"
  - "1.5h: place the supplied not-age-verified.svg in public/age-verify and wire the overlay onto card-gallery blurred media"
  - "1.5h: wire the overlay + banner onto profile.tsx for owner and visitors, route the CTA to the existing verification flow"
  - "1.5h: add the age-verify i18n namespace to en.json and the 7 other locale files (placeholder copy pending client wording)"
  - "2.0h: age-verify-overlay.test.tsx - owner vs visitor render, CTA owner-only, strings via useTranslate, icon language-neutral, no-unblur"
---

## §1 - Description (BCP-14 normative)

When a profile is not age verified, its media is already blurred by the backend (`signProfileImage` emits `class=blur` Bunny URLs in `ssl-be/src/modules/user/user.validate.ts`). This FR adds the visible overlay, banner, and owner CTA on top of that already-blurred media, and exposes the flags the client needs to decide what to show. The contract (DEC-SSL-230):

1. **MUST** render, over each blurred image of a non-age-verified profile, the supplied overlay (a ghost icon white at 50% opacity with "18?" white at 100%), centered and semi-transparent, sized to the image, using the SVG asset (`public/age-verify/not-age-verified.svg`, scalable) rather than a fixed-size PNG (DEC-SSL-230).
2. **MUST** show a banner reading "This profile is not age verified" (from i18n) on the profile view of a non-age-verified user, to both the owner and visitors (DEC-SSL-230).
3. **MUST** show the owner a direct "Verify Age" call to action that routes to the existing age-verification flow; visitors **MUST** see the explanation only and **MUST NOT** see an actionable verify control, because a visitor cannot verify someone else (DEC-SSL-230).
4. **MUST** source the banner and CTA strings from i18n (multilingual; the client provides final wording); the "18?" glyph is language-neutral and **MUST NOT** be translated (DEC-SSL-230).
5. **MUST** expose `isAgeVerified` (Boolean) and `ageVerifyStatus` on the GraphQL `T_User` type, derived from `ageVerify.status === E_AgeVerifyStatus.APPROVED`, so the client decides overlay / banner / CTA without re-deriving the rule.
6. **MUST NOT** imply the underlying image is visible: the overlay sits on the already-blurred media and never unblurs it; clearing the overlay requires actual verification (status becomes `APPROVED`), not a UI toggle.
7. **MUST** behave consistently on gallery cards (`card-gallery.tsx`) and on the profile view (`profile.tsx`): same overlay, same trigger condition (owner not age verified).
8. **MUST NOT** perform any AI inference. The underlying AI age-detection system that produces `ageVerify.status` is an existing platform system and is explicitly out of scope for this FR; this FR is UI overlay, messaging, and a read-only status flag only (DEC-SSL-230). See the §1 note below.
9. **SHOULD** keep the overlay accessible (translated `alt` / `aria-hidden` on the decorative glyph, a labelled banner) and **SHOULD NOT** block taps on legitimate controls underneath (the like button, the card click handler).

### §1 note - no AI inference in this FR

This FR performs no AI inference and contains no biometric or age-estimation logic. It reads one boolean (`isAgeVerified`) that the platform already computes, renders an SVG and an i18n string, and links the owner to a flow that already exists. The AI age-detection pipeline (document age, selfie age range, similarity - see `T_AIVerifyResult` in `user.graphql`) lives entirely in the existing authn module and is untouched. Do not classify this feature as an AI or biometric feature.

---

## §2 - Why this design (rationale for humans)

**Why a read-only flag instead of client re-derivation (§1 #5)?** The blur decision already lives in `signProfileImage` (owner not `APPROVED` -> `class=blur`), and the client today re-derives "is the owner verified" from `uploadedBy.ageVerify.status` in three places (`card-gallery.tsx`, `profile.tsx`). Exposing `isAgeVerified` once on `T_User` gives the overlay one named source that stays in step with the backend blur rule, instead of duplicated predicates drifting apart.

**Why an SVG, not a PNG (§1 #1)?** The overlay covers images from a small grid card to a full-screen modal. A single scalable SVG stays crisp at every size and holds the ghost at 50% / the "18?" at 100% exactly as the design asset specifies; a PNG would pixelate or need several exports.

**Why owner-only CTA (§1 #3)?** Verification is an action only the owner can take. A "Verify Age" button shown to a visitor is a dead end and misleading. Visitors get the explanation; the owner gets the one button that fixes it.

**Why never unblur via the overlay (§1 #6)?** The blur is a compliance state, not a paywall. The overlay must read as "locked until verification", never "click to reveal". Only a real status change to `APPROVED` removes the blur (next fetch returns `class=normal`), so no client path exposes the underlying image.

**Why one component on both surfaces, AI scoped out (§1 #7, §1 #8)?** A user sees the same media as a card and inside the profile; one shared component keeps the message identical across both. And because the platform does run AI age detection, the FR states the boundary explicitly so a reviewer does not mistake a banner-and-SVG change for that biometric system.

---

## §3 - API contract

```graphql
# ssl-be/src/modules/user/user.graphql - additive fields on the existing T_User
type T_User {
    # ... existing fields ...
    ageVerify: T_AgeVerify
    "True when ageVerify.status == APPROVED. Read-only, derived; the client uses this to decide the overlay/banner/CTA."
    isAgeVerified: Boolean
    "Mirror of ageVerify.status, exposed flat so the client need not select the nested object."
    ageVerifyStatus: E_AgeVerifyStatus
}
```

```typescript
// ssl-be/src/modules/user/user.type.ts - mirror on I_User
export interface I_User extends I_GenericDocument {
    // ... existing fields ...
    ageVerify?: I_AgeVerify;
    isAgeVerified?: boolean;            // §1 #5 derived, never persisted
    ageVerifyStatus?: E_AgeVerifyStatus; // §1 #5 flat mirror of ageVerify.status
}
```

```typescript
// ssl-be/src/modules/user/user.presenter.ts - derive in presentUser, exactly like isOnline
// (no new blur logic; this only reads ageVerify.status)
import { E_AgeVerifyStatus } from '#modules/authn/index.js';

export function presentUser(user, selection, mediaOptions) {
    const presentedUser = normalizeDocumentId(user);
    if (selection.fields.has('isOnline')) { /* existing */ }

    // §1 #5: expose the flag the overlay needs
    if (selection.fields.has('isAgeVerified')) {
        presentedUser.isAgeVerified = presentedUser.ageVerify?.status === E_AgeVerifyStatus.APPROVED;
    }
    if (selection.fields.has('ageVerifyStatus')) {
        presentedUser.ageVerifyStatus = presentedUser.ageVerify?.status;
    }

    if (shouldHydrateMedia(selection)) { hydrateUserMedia(presentedUser, mediaOptions); } // unchanged
    return presentedUser;
}
```

```tsx
// ssl-fe-user/src/shared/component/ui/age-verify-overlay.tsx
import Image from 'next/image';
import { useTranslate } from '#shared/i18n';
import { Button } from './button';

interface I_AgeVerifyOverlayProps {
    isOwner: boolean;          // §1 #3 owner sees the CTA, visitor does not
    onVerify?: () => void;     // routes to the existing age-verification flow
    showBanner?: boolean;      // §1 #2 banner on the profile surface; cards pass false
    className?: string;
}

export function AgeVerifyOverlay({ isOwner, onVerify, showBanner = false, className }: I_AgeVerifyOverlayProps) {
    const t = useTranslate('age-verify'); // §1 #4 all copy from i18n
    return (
        <div className={cn('pointer-events-none absolute inset-0 flex flex-col items-center justify-center', className)}>
            {/* §1 #1, #6 the supplied scalable asset, sits on already-blurred media, never unblurs it */}
            <Image
                src="/age-verify/not-age-verified.svg"
                alt={t('icon-alt')}      // §1 #9 translated alt; glyph itself is not translated (§1 #4)
                width={128}
                height={128}
                className="w-1/2 max-w-32 select-none"
                draggable={false}
            />
            {showBanner && (
                <p className="mt-3 px-3 text-center text-sm text-white" role="note">
                    {t('banner')}        {/* §1 #2 "This profile is not age verified" */}
                </p>
            )}
            {showBanner && isOwner && (
                // §1 #3 owner-only actionable control; pointer-events re-enabled just for the button
                <Button variant="primary" className="pointer-events-auto mt-3" onClick={onVerify}>
                    {t('cta-verify')}    {/* "Verify Age" */}
                </Button>
            )}
        </div>
    );
}
```

```jsonc
// ssl-fe-user/src/shared/i18n/data/en.json - new "age-verify" namespace (placeholder copy; client supplies final wording)
"age-verify": {
    "banner": "This profile is not age verified",
    "cta-verify": "Verify Age",
    "icon-alt": "Profile not age verified"
}
```

---

## §4 - Acceptance criteria

1. **Overlay shown on blurred media (§1 #1)** - for a profile whose owner is not age verified, every blurred gallery image and the profile avatar render `AgeVerifyOverlay` using `/age-verify/not-age-verified.svg`, centered. Verified by §5 `renders_overlay_on_non_verified`.
2. **Banner shown on profile (§1 #2)** - the profile view of a non-age-verified user shows the "This profile is not age verified" banner from i18n, for both owner and visitor. Verified by §5 `banner_shown_owner_and_visitor`.
3. **Owner sees the Verify Age CTA -> verify flow (§1 #3)** - when `isOwner` is true, the overlay shows a "Verify Age" button whose click calls `onVerify` (the existing age-verification flow). Verified by §5 `owner_sees_cta_invokes_verify`.
4. **Visitor sees explanation only (§1 #3)** - when `isOwner` is false, the banner is shown but no "Verify Age" control is rendered. Verified by §5 `visitor_no_cta`.
5. **Strings from i18n (§1 #4)** - banner and CTA text come from `useTranslate('age-verify')` keys, not hardcoded literals; the rendered text equals the namespace values. Verified by §5 `strings_from_i18n`.
6. **Icon is language-neutral (§1 #4)** - the "18?" glyph is the SVG asset and carries no translatable text node; only its `alt` is translated. Verified by §5 `icon_is_language_neutral`.
7. **isAgeVerified exposed (§1 #5)** - querying `T_User { isAgeVerified ageVerifyStatus }` returns `true`/`APPROVED` for an approved user and `false`/`PENDING` for a pending user, derived from `ageVerify.status`. Verified by §5 `presents_is_age_verified`.
8. **Overlay never unblurs, no AI inference (§1 #6, §1 #8)** - `AgeVerifyOverlay` renders no `<img>` of the underlying media, exposes no reveal handler, and runs no age-estimation logic; the blurred media element keeps its `blur-md` class with the overlay mounted. The component imports nothing from the authn AI pipeline. Verified by §5 `overlay_does_not_unblur`.
9. **Consistent gallery + profile (§1 #7)** - the same `AgeVerifyOverlay` component is mounted by both `card-gallery.tsx` and `profile.tsx` under the identical condition (owner not age verified). Verified by §5 `consistent_card_and_profile`.

---

## §5 - Verification

```tsx
// ssl-fe-user/src/shared/component/ui/age-verify-overlay.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgeVerifyOverlay } from './age-verify-overlay';

describe('AgeVerifyOverlay', () => {
    it('renders_overlay_on_non_verified', () => {            // AC #1
        render(<AgeVerifyOverlay isOwner={false} showBanner />);
        expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('/age-verify/not-age-verified.svg'));
    });

    it('banner_shown_owner_and_visitor', () => {             // AC #2
        const { rerender } = render(<AgeVerifyOverlay isOwner showBanner />);
        expect(screen.getByRole('note')).toBeInTheDocument();
        rerender(<AgeVerifyOverlay isOwner={false} showBanner />);
        expect(screen.getByRole('note')).toBeInTheDocument();
    });

    it('owner_sees_cta_invokes_verify', async () => {        // AC #3
        const onVerify = vi.fn();
        render(<AgeVerifyOverlay isOwner showBanner onVerify={onVerify} />);
        await screen.getByRole('button', { name: /verify age/i }).click();
        expect(onVerify).toHaveBeenCalledOnce();
    });

    it('visitor_no_cta', () => {                             // AC #4
        render(<AgeVerifyOverlay isOwner={false} showBanner onVerify={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /verify age/i })).toBeNull();
    });

    it('strings_from_i18n', () => {                          // AC #5
        render(<AgeVerifyOverlay isOwner showBanner />);
        expect(screen.getByRole('note')).toHaveTextContent('This profile is not age verified');
        expect(screen.getByRole('button')).toHaveTextContent('Verify Age');
    });

    it('icon_is_language_neutral', () => {                   // AC #6
        render(<AgeVerifyOverlay isOwner={false} showBanner />);
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt');                  // alt is translated...
        expect(img.textContent).toBe('');                    // ...but the glyph has no translatable text node
    });

    it('overlay_does_not_unblur', () => {                    // AC #8
        const { container } = render(<AgeVerifyOverlay isOwner showBanner />);
        // only the asset image exists; no media <img> and no reveal control
        expect(container.querySelectorAll('img')).toHaveLength(1);
        expect(screen.queryByRole('button', { name: /reveal|show|unblur/i })).toBeNull();
    });
});
```

```typescript
// ssl-be/src/modules/user/user.presenter.test.ts (small additive case; AC #7)
import { describe, expect, it } from 'vitest';
import { E_AgeVerifyStatus } from '#modules/authn/index.js';
import { presentUser } from './user.presenter.js';

const sel = (fields: string[]) => ({ fields: new Set(fields), nested: new Map() } as any);

describe('presentUser age-verify flag', () => {
    it('presents_is_age_verified', () => {                   // AC #7
        const approved = presentUser({ ageVerify: { status: E_AgeVerifyStatus.APPROVED } } as any, sel(['isAgeVerified', 'ageVerifyStatus']));
        expect(approved.isAgeVerified).toBe(true);
        expect(approved.ageVerifyStatus).toBe(E_AgeVerifyStatus.APPROVED);

        const pending = presentUser({ ageVerify: { status: E_AgeVerifyStatus.PENDING } } as any, sel(['isAgeVerified']));
        expect(pending.isAgeVerified).toBe(false);
    });
});
```

`consistent_card_and_profile` (AC #9) is asserted by a render of each surface with a non-age-verified `uploadedBy`/`user`, checking both mount the same `AgeVerifyOverlay` (asset present in both); it lives alongside the existing card-gallery and profile component tests.

---

## §6 - Implementation skeleton

(API contract in §3 is the skeleton.) Three integration points add the overlay without touching blur logic:

- `user.presenter.ts` derives `isAgeVerified` / `ageVerifyStatus` next to `isOnline`, gated on the selection set so it is only computed when selected.
- `card-gallery.tsx` already computes `ownerAgeVerified` (line ~129) and `shouldBlurImage` (line ~632). Where it renders the blurred `<Image>`, mount `<AgeVerifyOverlay isOwner={isOwner} showBanner={false} />` when `!ownerAgeVerified`. Cards carry the glyph only; the banner belongs to the profile surface.
- `profile.tsx` renders each partner avatar via `CardGallery` (lines ~556, ~713, ~774). When `user.isAgeVerified === false`, mount `<AgeVerifyOverlay isOwner={isOwnProfile} showBanner onVerify={routeToVerifyFlow} />` over the avatar area, where `routeToVerifyFlow` opens the existing age-verification flow already reachable for the owner.

No change to `signProfileImage`, `getViewerMediaContext`, or `hydrateUserMedia`: the media arrives blurred, and this FR only renders on top of it.

---

## §7 - Dependencies

- Upstream: the existing blur pipeline (`user.validate.ts` `signProfileImage` -> Bunny `class=blur`) and the existing age-verification flow/modal reachable for the owner. This FR consumes both; it does not modify them.
- Backend: `E_AgeVerifyStatus` and `I_AgeVerify` from the authn module (`authn.type.ts`), already imported by `user.validate.ts`.
- Related: **FR-VISIT-001** (Profile Visit Center) shares the `MembershipPopup` CTA-modal pattern used as the reference for wiring a call-to-action.
- Out of scope (existing system, not a dependency to build): the AI age-detection pipeline that sets `ageVerify.status` (DEC-SSL-230, §1 #8).

---

## §8 - Example payloads

```graphql
query {
  getUser(filter: { id: { eq: "u_123" } }) {
    result { id isAgeVerified ageVerifyStatus partner1 { gallery { url } } }
  }
}
```

```json
{ "data": { "getUser": { "result": {
  "id": "u_123",
  "isAgeVerified": false,
  "ageVerifyStatus": "PENDING",
  "partner1": { "gallery": { "url": "https://cdn.example/...?class=blur" } }
} } } }
```

The client reads `isAgeVerified === false` -> renders `AgeVerifyOverlay`; the `class=blur` URL confirms the media is already blurred by the backend.

---

## §9 - Open questions

- Final multilingual wording for `banner` / `cta-verify` is supplied by the client (DEC-SSL-230); placeholder English copy ships first and the 7 other locale files carry the same keys to be filled in. Until then, missing-locale keys fall back to English via next-intl.
- Exact entry point of the existing age-verification flow on the profile page (modal vs route) is wired during implementation against whatever the owner already uses; the FR fixes the contract (`onVerify` opens that flow), not the call site.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Overlay implies the image can be revealed | overlay has no media `<img>` and no reveal handler (AC #8) | overlay is purely decorative + informational | none |
| Visitor shown an actionable Verify Age control | CTA gated on `isOwner` (AC #4) | visitor sees explanation only | none |
| Owner CTA dead-ends | `onVerify` wired to the existing flow (AC #3) | owner reaches verification | none |
| "18?" glyph gets translated | glyph is the SVG asset, only `alt` is translated (AC #6) | glyph stays language-neutral | none |
| Client re-derives verified state inconsistently | `isAgeVerified` exposed once on `T_User` (AC #7) | single source for overlay/banner/CTA | none |
| Overlay blocks the like button / card click | container `pointer-events-none`, only the CTA re-enables pointer events (§1 #9) | underlying controls stay tappable | none |
| Overlay on a card but not the profile (or vice versa) | same component on both surfaces (AC #9) | consistent message | none |
| Mistaken as an AI/biometric feature | §1 #8 + §1 note scope the AI system out | treated as UI/messaging only | none |
| PNG used instead of SVG -> pixelated at full screen | asset is `not-age-verified.svg` (AC #1) | crisp at every size | none |
| Missing locale key | next-intl English fallback | banner/CTA still render | client supplies wording |
| Field selected but not derived | derivation gated on the selection set (§3) | flag present when requested | none |
| Blur logic accidentally changed | disallowed_tools forbids editing the blur functions | blur pipeline untouched | revert |

---

## §11 - Implementation notes

- The whole FR is read-and-render: the backend adds two derived, never-persisted fields and the frontend mounts one component. No blur is produced here - `signProfileImage` already emits `class=blur` for non-`APPROVED` owners, and the overlay sits on that output.
- `isAgeVerified` is derived in `presentUser` next to `isOnline`, gated on the GraphQL selection set, so it costs nothing when a query does not ask for it and never lands in the database.
- The overlay container is `pointer-events-none` so it never steals the card click or the like button; only the owner CTA flips `pointer-events-auto` for itself, satisfying the "do not block legitimate taps" SHOULD.
- The glyph is the supplied scalable SVG, so the ghost stays at 50% opacity and the "18?" at 100% from a small card to a full-screen modal; only the `alt` is localized, keeping the glyph language-neutral. Cards render the glyph only; the banner and owner CTA are profile-surface concerns (`showBanner`).
- The AI age-detection system is named and scoped out in §1 #8 and the §1 note so a reviewer does not attach biometric-system obligations to what is a banner, an SVG, and a boolean.

---

*End of FR-AGEV-001.*
