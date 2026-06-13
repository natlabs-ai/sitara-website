# Business Step UX Cleanup — Design

**Date:** 2026-06-13
**Scope:** Sitara onboarding, Step 2 (`corporateSetup` / Business)
**Status:** Approved, ready for implementation plan

## Problem

The Business step (Step 2 of the business onboarding flow) has three UX issues:

1. **Double boxes.** Each logical group is already a bordered card (`Section`), and then individual questions get *another* bordered box inside. The result is visually redundant nested containers and wasted vertical space. This diverges from the Identity step (Step 1), where each field group is a single card with plain content inside.
2. **Radio control fit.** The "business relationship" question uses native radio rows with long descriptive labels; it reads as more "form-y" than the surrounding card UI.
3. **Inconsistent gold usage.** The gold accent (`#bfa76f`) currently means three different things: primary action (Next button — solid fill), "complete" (passport upload — gold text), and faintly "selected" (Yes/No toggle — grey with a subtle gold inset). Controls don't feel like one family.

## Goals

- Flatten nested containers to match the Identity step's one-card-per-group pattern.
- Replace the relationship radios with selectable cards.
- Establish a single, consistent meaning for the gold accent and apply it flow-wide.

## Non-goals

- No changes to the underlying answer keys, validation logic, or which questions appear (`biz_orientation`, `incCountry`, `takes_ownership_of_metals`, `holds_client_assets_or_funds`, `settlement_facilitation`, `acts_as_intermediary`).
- No restructuring of other steps beyond the shared `YesNoToggle` restyle (which intentionally ripples flow-wide).
- No change to `DocumentUploadControl` behaviour — only token alignment so its "uploaded" state matches the new system.

## Design token system: what gold means

One rule: **gold = primary action, or active / selected / complete.** Solid gold *fill* is reserved for the single primary CTA; everything else uses a gold *accent*.

| State | Treatment |
|---|---|
| **Primary CTA** (Next) | Solid gold fill `#bfa76f`, dark text — unchanged, kept scarce |
| **Selected / active / complete** (toggle selected, selected card, uploaded) | Border `rgba(191,167,111,0.4)` + bg tint `rgba(191,167,111,0.08)` + text `#bfa76f` |
| **Idle / unselected** | Border `neutral-800`, bg `black/30` (or transparent), text `neutral-300` |
| **Hover (idle)** | Border → `neutral-600`, text → `neutral-200` |
| **Error** | Red (unchanged) |

The passport "Uploaded" pill (already gold text) is the template the other controls align to.

## Component changes

### 1. New: `SelectableCard`
A reusable clickable tile with radio/single-select semantics, used for the relationship question.

- **Interface:** `{ selected: boolean; onSelect: () => void; children: ReactNode; disabled?: boolean }` (plus an optional `name`/`value` if grouped semantics are needed).
- **Idle:** border `neutral-800`, bg `black/30`, text `neutral-200`, full-width, large padding, `cursor-pointer`.
- **Hover (idle):** border `neutral-600`.
- **Selected:** gold-accent state per the token table (border `rgba(191,167,111,0.4)`, bg `rgba(191,167,111,0.08)`, text `#bfa76f`).
- **Accessibility:** rendered as a `<button type="button">` (or `role="radio"` within a `role="radiogroup"`), keyboard-focusable, `aria-pressed`/`aria-checked` reflecting state.
- **Location:** `src/components/ui/compounds/SelectableCard.tsx`, exported via `compounds/index.ts`.

### 2. Restyle: `YesNoToggle` (flow-wide)
Change the selected-segment styling from grey to the gold-accent state.

- **Selected segment:** bg `rgba(191,167,111,0.08)`, inset/border `rgba(191,167,111,0.4)`, text `#bfa76f`.
- **Unselected segment:** text `neutral-400`, hover text `neutral-200` (unchanged).
- Container styling unchanged. This change applies everywhere `YesNoToggle` is used (Business activity, relationship profile, risk declarations, etc.) — intended, for consistency.

### 3. Token alignment: `DocumentUploadControl`
Confirm the "uploaded/success" state uses the exact token values above (border `rgba(191,167,111,0.4)`, text `#bfa76f`). Adjust only if it currently diverges. No behavioural change.

## Layout changes

### Business orientation card (`corporateSetup` block in `OnboardingRenderer.tsx`)
- Keep the outer card with the "Business" heading + description.
- Remove the inner bordered box around the relationship question.
- Render the two relationship options as `SelectableCard`s directly inside the outer card, bound to `biz_orientation` (`"activity"` / `"services"`).

### Country of Incorporation (`BusinessProfileStep.tsx`)
- No structural change. It is already a single `Section` card wrapping the `CountryCombobox` — matching the Identity step's "Country of Residence" card. It only *looked* heavy next to the nested boxes; flattening the neighbours resolves the perception.

### Business activity card (`BusinessProfileStep.tsx`)
- Keep the outer `Section` card with the "Business activity" heading + description.
- Remove the three per-question bordered boxes (`rounded-xl border ... p-4`).
- Each question becomes a plain row: question text + `YesNoToggle`, separated by thin dividers (`border-t border-neutral-800`) between rows.
- The conditional "settlement facilitation" sub-question remains an indented branch (left border) under "holds client assets or funds".
- Validation summary message and `showValidationErrors` behaviour unchanged.

## Files affected

- `src/components/ui/compounds/SelectableCard.tsx` — **new**
- `src/components/ui/compounds/index.ts` — export `SelectableCard`
- `src/components/ui/compounds/YesNoToggle.tsx` — restyle selected state
- `src/components/ui/compounds/DocumentUploadControl.tsx` — token alignment only (if needed)
- `src/components/onboarding/steps/BusinessProfileStep.tsx` — flatten Business activity, remove inner boxes
- `src/components/onboarding/OnboardingRenderer.tsx` (`corporateSetup` block) — flatten orientation card, swap radios → `SelectableCard`

## Verification

- Visual: Step 2 shows no nested boxes; one card per group, consistent with Step 1.
- Relationship question selects via cards with a gold-accent selected state; keyboard-navigable.
- Selecting/deselecting Yes/No across the flow shows the new gold-accent selected state everywhere.
- Passport "Uploaded" pill and the new selected states are visually the same gold treatment.
- Existing validation still blocks Next until all required questions are answered (no logic change).
- `npm run build` passes with no TypeScript errors.
- Changes remain local (no push/deploy) per current working preference.
