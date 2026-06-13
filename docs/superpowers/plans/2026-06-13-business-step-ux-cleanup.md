# Business Step UX Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flatten the nested-box layout on the Business onboarding step, replace the relationship radios with selectable cards, and unify the gold accent across all controls.

**Architecture:** Pure frontend (Next.js/React/Tailwind). Add one new presentational component (`SelectableCard`), restyle two shared controls (`YesNoToggle`, `DocumentUploadControl` success state), and flatten two step layouts (`OnboardingRenderer` `corporateSetup` block, `BusinessProfileStep`). Controls expose stable `data-testid`s so the existing Playwright golden-path is rewired off brittle text/`name` selectors.

**Tech Stack:** TypeScript, React 18, Next.js (App Router), Tailwind CSS, Playwright (E2E only — there is **no** unit-test runner; do **not** add Vitest/Jest/RTL, that would violate YAGNI for CSS-level changes).

**Gold-accent token (memorise — used in every styling task):**
- Selected / active / complete → `border-[#bfa76f]/40 bg-[#bfa76f]/[0.08] text-[#bfa76f]`
- Idle → `border-neutral-800 bg-black/30 text-neutral-300`
- Hover (idle) → `hover:border-neutral-600 hover:text-neutral-200`
- Primary CTA (Next button) → unchanged (solid gold fill, kept scarce)

**Keep changes local — do NOT push or deploy** (current working preference).

---

### Task 1: Create `SelectableCard` component

**Files:**
- Create: `src/components/ui/compounds/SelectableCard.tsx`
- Modify: `src/components/ui/compounds/index.ts`

- [ ] **Step 1: Create the component**

Create `src/components/ui/compounds/SelectableCard.tsx`:

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectableCardProps {
  /** Whether this card is the currently selected option */
  selected: boolean;
  /** Called when the user picks this card */
  onSelect: () => void;
  /** Card content (usually the option label) */
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Optional test identifier for E2E testing */
  testId?: string;
}

export const SelectableCard: React.FC<SelectableCardProps> = ({
  selected,
  onSelect,
  children,
  disabled = false,
  className,
  testId,
}) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => !disabled && onSelect()}
      data-testid={testId}
      className={cn(
        'w-full text-left rounded-xl border p-4 text-sm transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bfa76f]/50',
        disabled && 'opacity-50 cursor-not-allowed',
        selected
          ? 'border-[#bfa76f]/40 bg-[#bfa76f]/[0.08] text-[#bfa76f]'
          : 'border-neutral-800 bg-black/30 text-neutral-200 hover:border-neutral-600 hover:text-neutral-100',
        className,
      )}
    >
      {children}
    </button>
  );
};

export default SelectableCard;
```

- [ ] **Step 2: Export it from the compounds barrel**

In `src/components/ui/compounds/index.ts`, after the `CountryCombobox` export (line 35), add:

```ts
export { SelectableCard } from './SelectableCard';
export type { SelectableCardProps } from './SelectableCard';
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors. (If the full build is slow, `npx tsc --noEmit` is an acceptable faster check.)

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors in `SelectableCard.tsx` or `index.ts`.

- [ ] **Step 5: Commit (local only — do not push)**

```bash
git add src/components/ui/compounds/SelectableCard.tsx src/components/ui/compounds/index.ts
git commit -m "feat(ui): add SelectableCard component (gold-accent selected state)"
```

---

### Task 2: Restyle `YesNoToggle` to gold-accent + add `testId`

**Files:**
- Modify: `src/components/ui/compounds/YesNoToggle.tsx`

The current selected segment is grey (`bg-neutral-700 text-neutral-100`) with an absolutely-positioned gold inset overlay. Replace it with the gold-accent token directly and add an optional `testId` that tags the wrapper and each button (`${testId}-yes`, `${testId}-no`) so E2E can target them stably.

- [ ] **Step 1: Replace the component body**

Replace the entire contents of `src/components/ui/compounds/YesNoToggle.tsx` with:

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface YesNoToggleProps {
  value: 'yes' | 'no' | null;
  onChange: (value: 'yes' | 'no') => void;
  yesLabel?: string;
  noLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Optional test identifier for E2E testing (buttons get `${testId}-yes` / `${testId}-no`) */
  testId?: string;
}

export const YesNoToggle: React.FC<YesNoToggleProps> = ({
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  disabled = false,
  className,
  testId,
}) => {
  return (
    <div
      data-testid={testId}
      className={cn(
        'inline-flex rounded-lg border border-neutral-700 bg-neutral-900 p-0.5',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {(['yes', 'no'] as const).map((option) => {
        const isSelected = value === option;
        const label = option === 'yes' ? yesLabel : noLabel;
        return (
          <button
            key={option}
            type="button"
            onClick={() => !disabled && onChange(option)}
            disabled={disabled}
            data-testid={testId ? `${testId}-${option}` : undefined}
            className={cn(
              'px-5 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
              'disabled:cursor-not-allowed',
              isSelected
                ? 'bg-[#bfa76f]/[0.08] text-[#bfa76f] ring-1 ring-inset ring-[#bfa76f]/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default YesNoToggle;
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors. The `YesNoToggleProps` interface gained an optional `testId` — no existing call site breaks.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit (local only — do not push)**

```bash
git add src/components/ui/compounds/YesNoToggle.tsx
git commit -m "refactor(ui): YesNoToggle selected state -> gold accent + testId support"
```

---

### Task 3: Align `DocumentUploadControl` success state to the gold token

**Files:**
- Modify: `src/components/ui/compounds/DocumentUploadControl.tsx:115-117`

Currently the success state is `border-neutral-700 bg-black/70 text-[#bfa76f]` (gold text, neutral border). Add the gold border + faint tint so the "Uploaded" pill matches the selected/active/complete token exactly.

- [ ] **Step 1: Update the success-state classes**

In `src/components/ui/compounds/DocumentUploadControl.tsx`, find this entry in the `buttonClasses` `cn({...})` object (around lines 115-117):

```tsx
      // Success state: same neutral bg, gold text only
      'border-neutral-700 bg-black/70 text-[#bfa76f] hover:border-[#bfa76f]':
        isSuccess,
```

Replace it with:

```tsx
      // Success state: gold-accent token (border + faint tint + gold text)
      'border-[#bfa76f]/40 bg-[#bfa76f]/[0.08] text-[#bfa76f]':
        isSuccess,
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Commit (local only — do not push)**

```bash
git add src/components/ui/compounds/DocumentUploadControl.tsx
git commit -m "refactor(ui): align DocumentUploadControl success state to gold token"
```

---

### Task 4: Flatten the orientation card + swap radios for `SelectableCard`

**Files:**
- Modify: `src/components/onboarding/OnboardingRenderer.tsx:1225-1267` (the `corporateSetup` orientation `<section>`)

Remove the inner bordered box and the native radios; render two `SelectableCard`s inside a `role="radiogroup"`, bound to `biz_orientation`. Give them stable testids `orientation-activity` / `orientation-services`.

- [ ] **Step 1: Ensure `SelectableCard` is imported**

Near the top of `src/components/onboarding/OnboardingRenderer.tsx`, confirm the UI import includes `SelectableCard`. If the file imports from `@/components/ui`, add `SelectableCard` to that import list. If there is no such import yet, add:

```tsx
import { SelectableCard } from "@/components/ui";
```

(Place it with the other `@/components/ui` imports. Verify `SelectableCard` is re-exported from `@/components/ui` — Task 1 exported it from the compounds barrel; confirm the top-level `src/components/ui/index.ts` re-exports the compounds barrel. If it does not, import from `@/components/ui/compounds` instead.)

- [ ] **Step 2: Replace the orientation `<section>` JSX**

Replace this block (currently lines ~1225-1267):

```tsx
          {/* Optional orientation (UX only; no logic) */}
          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <h2 className="text-sm font-semibold text-neutral-100">Business</h2>
            <p className="mt-1 text-xs text-neutral-400">
              We&apos;ll ask a few questions to understand how your business interacts
              with precious metals.
            </p>

            <div className="mt-4 rounded-xl border border-neutral-800 bg-black/25 p-4">
              <div className="text-sm font-medium text-neutral-100">
                Which best describes your business relationship with precious
                metals?
              </div>
              <div className="mt-3 space-y-2">
                {[
                  {
                    value: "activity",
                    label:
                      "We trade, source, refine, manufacture, or sell precious metals",
                  },
                  {
                    value: "services",
                    label:
                      "We provide services or infrastructure to the precious-metals industry",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2 text-xs text-neutral-200"
                  >
                    <input
                      type="radio"
                      name="biz_orientation"
                      value={opt.value}
                      checked={answers.biz_orientation === opt.value}
                      onChange={() => setValue("biz_orientation", opt.value)}
                      className="mt-[2px] h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-[--gold-color] focus:ring-[--gold-color]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
```

with:

```tsx
          {/* Optional orientation (UX only; no logic) */}
          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <h2 className="text-sm font-semibold text-neutral-100">Business</h2>
            <p className="mt-1 text-xs text-neutral-400">
              We&apos;ll ask a few questions to understand how your business interacts
              with precious metals.
            </p>

            <p className="mt-4 text-sm font-medium text-neutral-100">
              Which best describes your business relationship with precious metals?
            </p>
            <div
              role="radiogroup"
              aria-label="Business relationship with precious metals"
              className="mt-3 space-y-2"
            >
              {[
                {
                  value: "activity",
                  label:
                    "We trade, source, refine, manufacture, or sell precious metals",
                },
                {
                  value: "services",
                  label:
                    "We provide services or infrastructure to the precious-metals industry",
                },
              ].map((opt) => (
                <SelectableCard
                  key={opt.value}
                  testId={`orientation-${opt.value}`}
                  selected={answers.biz_orientation === opt.value}
                  onSelect={() => setValue("biz_orientation", opt.value)}
                >
                  {opt.label}
                </SelectableCard>
              ))}
            </div>
          </section>
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit (local only — do not push)**

```bash
git add src/components/onboarding/OnboardingRenderer.tsx
git commit -m "refactor(onboarding): flatten orientation card, radios -> SelectableCard"
```

---

### Task 5: Flatten the Business activity section + add toggle testIds

**Files:**
- Modify: `src/components/onboarding/steps/BusinessProfileStep.tsx:45-92` (the Business activity `<Section>`)

Remove the three per-question `rounded-xl border ... p-4` boxes. Each question becomes a plain row inside the outer `Section`; rows after the first are separated by a top divider. Pass a stable `testId` to each `YesNoToggle`. Leave the Country of Incorporation block (lines 27-43) unchanged.

- [ ] **Step 1: Replace the Business activity `<Section>` JSX**

Replace this block (currently lines ~45-92):

```tsx
      {/* Business activity questions */}
      <Section>
        <div className="mb-3">
          <p className="text-sm font-semibold text-neutral-100">Business activity</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            These questions determine which compliance documents apply to your business.
          </p>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business ever take ownership of precious metals?</p>
            <YesNoToggle
              value={answers.takes_ownership_of_metals === true ? 'yes' : answers.takes_ownership_of_metals === false ? 'no' : null}
              onChange={(v) => setValue("takes_ownership_of_metals", v === 'yes')}
            />
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business hold client assets or funds?</p>
            <YesNoToggle
              value={holdsAssets === true ? 'yes' : holdsAssets === false ? 'no' : null}
              onChange={(v) => { setValue("holds_client_assets_or_funds", v === 'yes'); if (v === 'no') setValue("settlement_facilitation", undefined); }}
            />
            {holdsAssets === true && (
              <div className="pl-3 border-l border-neutral-700 space-y-3">
                <p className="text-sm text-neutral-200">Do you facilitate settlement (escrow-style)?</p>
                <YesNoToggle
                  value={answers.settlement_facilitation === true ? 'yes' : answers.settlement_facilitation === false ? 'no' : null}
                  onChange={(v) => setValue("settlement_facilitation", v === 'yes')}
                />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business arrange or execute transactions for clients?</p>
            <YesNoToggle
              value={answers.acts_as_intermediary === true ? 'yes' : answers.acts_as_intermediary === false ? 'no' : null}
              onChange={(v) => setValue("acts_as_intermediary", v === 'yes')}
            />
          </div>
        </div>
        {showValidationErrors &&
          (answers.takes_ownership_of_metals === undefined ||
           answers.holds_client_assets_or_funds === undefined ||
           answers.acts_as_intermediary === undefined ||
           (holdsAssets === true && answers.settlement_facilitation === undefined)) && (
          <p className="mt-3 text-xs text-red-400">Please answer all questions above.</p>
        )}
      </Section>
```

with:

```tsx
      {/* Business activity questions */}
      <Section>
        <div className="mb-4">
          <p className="text-sm font-semibold text-neutral-100">Business activity</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            These questions determine which compliance documents apply to your business.
          </p>
        </div>
        <div className="divide-y divide-neutral-800">
          {/* Q1 */}
          <div className="flex flex-col gap-3 py-4 first:pt-0" data-testid="q-takes-ownership-row">
            <p className="text-sm text-neutral-200">Does the business ever take ownership of precious metals?</p>
            <YesNoToggle
              testId="q-takes-ownership"
              value={answers.takes_ownership_of_metals === true ? 'yes' : answers.takes_ownership_of_metals === false ? 'no' : null}
              onChange={(v) => setValue("takes_ownership_of_metals", v === 'yes')}
            />
          </div>

          {/* Q2 + conditional settlement follow-up */}
          <div className="flex flex-col gap-3 py-4" data-testid="q-holds-assets-row">
            <p className="text-sm text-neutral-200">Does the business hold client assets or funds?</p>
            <YesNoToggle
              testId="q-holds-assets"
              value={holdsAssets === true ? 'yes' : holdsAssets === false ? 'no' : null}
              onChange={(v) => { setValue("holds_client_assets_or_funds", v === 'yes'); if (v === 'no') setValue("settlement_facilitation", undefined); }}
            />
            {holdsAssets === true && (
              <div className="mt-1 pl-3 border-l border-neutral-700 flex flex-col gap-3">
                <p className="text-sm text-neutral-200">Do you facilitate settlement (escrow-style)?</p>
                <YesNoToggle
                  testId="q-settlement-facilitation"
                  value={answers.settlement_facilitation === true ? 'yes' : answers.settlement_facilitation === false ? 'no' : null}
                  onChange={(v) => setValue("settlement_facilitation", v === 'yes')}
                />
              </div>
            )}
          </div>

          {/* Q3 */}
          <div className="flex flex-col gap-3 py-4" data-testid="q-acts-intermediary-row">
            <p className="text-sm text-neutral-200">Does the business arrange or execute transactions for clients?</p>
            <YesNoToggle
              testId="q-acts-intermediary"
              value={answers.acts_as_intermediary === true ? 'yes' : answers.acts_as_intermediary === false ? 'no' : null}
              onChange={(v) => setValue("acts_as_intermediary", v === 'yes')}
            />
          </div>
        </div>
        {showValidationErrors &&
          (answers.takes_ownership_of_metals === undefined ||
           answers.holds_client_assets_or_funds === undefined ||
           answers.acts_as_intermediary === undefined ||
           (holdsAssets === true && answers.settlement_facilitation === undefined)) && (
          <p className="mt-3 text-xs text-red-400">Please answer all questions above.</p>
        )}
      </Section>
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit (local only — do not push)**

```bash
git add src/components/onboarding/steps/BusinessProfileStep.tsx
git commit -m "refactor(onboarding): flatten Business activity rows, add toggle testIds"
```

---

### Task 6: Rewire the E2E golden path to stable testIds and verify

**Files:**
- Modify: `e2e/pages/CorporateSetupPage.ts:49-90`
- Modify: `e2e/specs/golden-path.spec.ts` (the `waitForSelector('input[name="biz_orientation"]')` line)

The orientation radio and the per-question text-regex block heuristics no longer match (radios are gone; the regexes for Q2/Q3 never matched current copy anyway). Replace them with the stable testids added in Tasks 4 and 5.

- [ ] **Step 1: Replace the `fill()` body in `CorporateSetupPage.ts`**

Replace the `fill()` method (lines 49-90) with:

```ts
  async fill(data: CorporateSetupData) {
    // Business orientation — SelectableCard with testId orientation-activity | orientation-services
    await this.page.getByTestId(`orientation-${data.bizOrientation}`).click()

    // Country of Incorporation — GoldCombobox (custom text input + ul/button dropdown)
    const countryInput = this.page.getByPlaceholder('Start typing to search…')
    await countryInput.click()
    await countryInput.fill(data.incCountry.slice(0, 5))
    await this.page.locator('ul button').filter({ hasText: data.incCountry }).first().click()

    // Deterministic Q1: takes ownership of metals
    await this.page
      .getByTestId(`q-takes-ownership-${data.takesOwnership ? 'yes' : 'no'}`)
      .click()

    // Deterministic Q2: holds client assets or funds
    await this.page
      .getByTestId(`q-holds-assets-${data.holdsClientAssets ? 'yes' : 'no'}`)
      .click()

    // Settlement facilitation follow-up (only if Q2 = Yes)
    if (data.holdsClientAssets && data.settlementFacilitation !== undefined) {
      await this.page
        .getByTestId(`q-settlement-facilitation-${data.settlementFacilitation ? 'yes' : 'no'}`)
        .click()
    }

    // Deterministic Q3: acts as intermediary
    await this.page
      .getByTestId(`q-acts-intermediary-${data.actsAsIntermediary ? 'yes' : 'no'}`)
      .click()
  }
```

- [ ] **Step 2: Update the orientation wait in `golden-path.spec.ts`**

In `e2e/specs/golden-path.spec.ts`, find (around line 89):

```ts
    await page.waitForSelector('input[name="biz_orientation"]')
```

Replace with:

```ts
    await page.waitForSelector('[data-testid="orientation-activity"]')
```

- [ ] **Step 3: Run the business golden-path E2E**

Run: `npm run test:e2e -- golden-path.spec.ts`
Expected: PASS. (Per the project's Playwright notes, a first-run Next.js manifest race can cause a flaky failure — if it fails on a navigation/manifest error, re-run once. A genuine selector failure will fail deterministically on both runs.)

If it fails on a real selector mismatch, confirm the testids in the DOM match exactly: `orientation-activity`, `orientation-services`, `q-takes-ownership-yes/no`, `q-holds-assets-yes/no`, `q-settlement-facilitation-yes/no`, `q-acts-intermediary-yes/no`.

- [ ] **Step 4: Commit (local only — do not push)**

```bash
git add e2e/pages/CorporateSetupPage.ts e2e/specs/golden-path.spec.ts
git commit -m "test(e2e): rewire corporateSetup interactions to stable testIds"
```

---

### Task 7: Final visual + regression check

**Files:** none (verification only)

- [ ] **Step 1: Run the dev server and eyeball Step 2**

Run: `npm run dev`, open the onboarding flow, advance a business application to Step 2 (Business). Confirm:
- No nested/double boxes: one card each for Business orientation, Country of Incorporation, and Business activity.
- The relationship options are selectable cards; the chosen one shows the gold-accent state (gold border + faint tint + gold text).
- Yes/No toggles show the same gold-accent selected state (not grey).
- The Business activity questions are plain rows separated by thin dividers; the settlement follow-up still appears indented when "holds client assets" = Yes.
- Compare against Step 1 (Identity): the passport "Uploaded" pill and the new selected states use the same gold treatment.

- [ ] **Step 2: Full E2E regression**

Run: `npm run test:e2e`
Expected: PASS (golden-path, individual-golden-path, save-resume). The individual path does not hit the Business step; golden-path and any business-touching specs should pass with the rewired selectors.

- [ ] **Step 3: Final build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

No commit needed (verification only). Leave all work as local commits — do not push or deploy.

---

## Self-Review

**Spec coverage:**
- Container flattening (orientation, activity) → Tasks 4, 5. Country of Incorporation left unchanged per spec → noted in Task 5. ✓
- Selectable cards for relationship question → Tasks 1, 4. ✓
- Gold-accent token system, flow-wide `YesNoToggle` restyle → Task 2; `DocumentUploadControl` alignment → Task 3; `SelectableCard` selected state → Task 1. ✓
- New `SelectableCard` component + barrel export → Task 1. ✓
- Verification (visual, validation unchanged, build) → Task 7. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type/name consistency:** testids are consistent across producer and consumer tasks — `orientation-activity`/`orientation-services` (Task 4 → Task 6); `q-takes-ownership`, `q-holds-assets`, `q-settlement-facilitation`, `q-acts-intermediary` toggles (Task 5) → `${testId}-yes`/`-no` buttons (Task 2) → consumed in Task 6. `YesNoToggle` gained optional `testId`; `SelectableCard` props (`selected`, `onSelect`, `testId`) match between Task 1 and Task 4. ✓
