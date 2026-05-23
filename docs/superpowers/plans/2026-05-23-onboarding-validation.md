# Onboarding Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline blur-triggered validation and submission guards across all onboarding steps: required-field checks, email format, 18+ DOB minimum, and block progression if beneficial owner total exceeds 100%.

**Architecture:** Seven targeted changes — one new shared utility file, five step component updates, two canGoNext additions in OnboardingRenderer. No new routes, no API changes, no new components.

**Tech Stack:** React 18, TypeScript, Next.js App Router. `Input` and `Textarea` accept `onBlur` via `...props` spread. `FormField` renders the error message only when both `error` and `showError` are truthy.

---

## File Structure

| File | Change |
|------|--------|
| `src/components/onboarding/validationUtils.ts` | **Create** — shared validators: `isNonEmpty`, `minLength`, `isValidEmail`, `isAtLeast18` |
| `src/components/onboarding/steps/ProfileStep.tsx` | Add `touched` state + blur handlers for occupation & sourceOfIncome; add `showError` to FormFields |
| `src/components/onboarding/steps/IdentityStep.tsx` | Add 18+ check in `getFieldErrors()` |
| `src/components/onboarding/steps/RiskDeclarationsStep.tsx` | Add `touched` state + blur for detail textareas; add inline errors |
| `src/components/onboarding/steps/OwnershipStep.tsx` | Sync `totalOwnership` into answers via `useEffect`; add `ownershipDeclaration` visual error |
| `src/components/onboarding/steps/RelationshipProfileStep.tsx` | Destructure `showValidationErrors`; add visual error indicators for products and payment methods |
| `src/components/onboarding/OnboardingRenderer.tsx` | Add `"ownership"` canGoNext block; add detail-required check to `"riskDeclarations"` block |

---

### Task 1: Create validationUtils.ts

**Files:**
- Create: `src/components/onboarding/validationUtils.ts`

- [ ] **Step 1: Create the file with four named exports**

```typescript
export function isNonEmpty(s: string): boolean {
  return s.trim().length > 0;
}

export function minLength(s: string, n: number): boolean {
  return s.trim().length >= n;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isAtLeast18(dob: string): boolean {
  if (!dob) return false;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return false;
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return dobDate <= cutoff;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `sitara-website/`:
```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/validationUtils.ts
git commit -m "feat(validation): add shared onboarding validators"
```

---

### Task 2: ProfileStep — blur validation for occupation and sourceOfIncome

**Files:**
- Modify: `src/components/onboarding/steps/ProfileStep.tsx`

Current state: `FormField` wrappers for occupation and sourceOfIncome have no `error` or `showError` props. The services chip group only shows a `*` asterisk on the label when `showValidationErrors`.

- [ ] **Step 1: Add `useState` import and `touched` state**

At the top of the component body (after `const selectedServices = ...`), add:

```tsx
const [touched, setTouched] = React.useState<Record<string, boolean>>({});
const touch = (field: string) =>
  setTouched((prev) => ({ ...prev, [field]: true }));
```

Note: `React` is already imported via `import React from "react"`. `useState` is not imported separately; use `React.useState`.

- [ ] **Step 2: Update the occupation FormField**

Replace:
```tsx
        <FormField
          label="Occupation"
          required
          htmlFor="occupation"
          helperText="Required under UAE AML / CFT and goAML CDD rules."
        >
          <Input
            id="occupation"
            type="text"
            value={occupation}
            onChange={(value) => setValue("occupation", value)}
            placeholder="e.g. Finance Manager, Jewellery Trader, Business Owner"
          />
        </FormField>
```

With:
```tsx
        <FormField
          label="Occupation"
          required
          htmlFor="occupation"
          helperText="Required under UAE AML / CFT and goAML CDD rules."
          error="This field is required."
          showError={(touched.occupation || showValidationErrors) && !occupation.trim()}
        >
          <Input
            id="occupation"
            type="text"
            value={occupation}
            onChange={(value) => setValue("occupation", value)}
            onBlur={() => touch("occupation")}
            placeholder="e.g. Finance Manager, Jewellery Trader, Business Owner"
          />
        </FormField>
```

- [ ] **Step 3: Update the sourceOfIncome FormField**

Replace:
```tsx
        <FormField
          label="Source of income"
          required
          htmlFor="sourceOfIncome"
          helperText="Describe the main source(s) of your income. This is used for risk assessment and CDD."
        >
          <Textarea
            id="sourceOfIncome"
            value={sourceOfIncome}
            onChange={(value) => setValue("sourceOfIncome", value)}
            placeholder="Salary, business profits, investment income, rental income, etc."
            rows={3}
          />
        </FormField>
```

With:
```tsx
        <FormField
          label="Source of income"
          required
          htmlFor="sourceOfIncome"
          helperText="Describe the main source(s) of your income. This is used for risk assessment and CDD."
          error="This field is required."
          showError={(touched.sourceOfIncome || showValidationErrors) && !sourceOfIncome.trim()}
        >
          <Textarea
            id="sourceOfIncome"
            value={sourceOfIncome}
            onChange={(value) => setValue("sourceOfIncome", value)}
            onBlur={() => touch("sourceOfIncome")}
            placeholder="Salary, business profits, investment income, rental income, etc."
            rows={3}
          />
        </FormField>
```

- [ ] **Step 4: Add error text below service categories when none selected**

After the `<div className="flex flex-wrap gap-2">` closing tag (just before the `</div>` that closes the `<div className="pt-1">`), add:

```tsx
          {showValidationErrors && selectedServices.length === 0 && (
            <p className="mt-1 text-xs text-red-400">Please select at least one service.</p>
          )}
```

- [ ] **Step 5: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/steps/ProfileStep.tsx
git commit -m "feat(validation): blur validation for occupation and source of income"
```

---

### Task 3: IdentityStep — 18+ DOB validation in modal

**Files:**
- Modify: `src/components/onboarding/steps/IdentityStep.tsx`

Current state: `getFieldErrors()` validates that `dateOfBirth` is non-empty and a valid `YYYY-MM-DD` date, but has no age check.

- [ ] **Step 1: Import `isAtLeast18` from validationUtils**

Add to imports at top of file:
```tsx
import { isAtLeast18 } from "../validationUtils";
```

- [ ] **Step 2: Add 18+ check in `getFieldErrors()`**

Find the block (around line 209):
```tsx
    if (!formDraft.dateOfBirth.trim()) {
      errors.dateOfBirth = "Date of birth is required";
    } else if (!isValidDate(formDraft.dateOfBirth)) {
      errors.dateOfBirth = "Please enter a valid date (YYYY-MM-DD)";
    }
```

Replace with:
```tsx
    if (!formDraft.dateOfBirth.trim()) {
      errors.dateOfBirth = "Date of birth is required";
    } else if (!isValidDate(formDraft.dateOfBirth)) {
      errors.dateOfBirth = "Please enter a valid date (YYYY-MM-DD)";
    } else if (!isAtLeast18(formDraft.dateOfBirth)) {
      errors.dateOfBirth = "You must be at least 18 years old";
    }
```

- [ ] **Step 3: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/steps/IdentityStep.tsx
git commit -m "feat(validation): enforce 18+ minimum age in identity modal"
```

---

### Task 4: RiskDeclarationsStep — blur validation for conditional detail textareas

**Files:**
- Modify: `src/components/onboarding/steps/RiskDeclarationsStep.tsx`

Current state: The three detail textareas (pepDetails, sanctionsDetails, thirdPartyDetails) are raw `<textarea>` elements with no validation. They only appear when the respective Yes button is clicked.

- [ ] **Step 1: Add `touched` state**

At the top of the component body (after the variable declarations), add:
```tsx
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));
```

- [ ] **Step 2: Add blur + inline error to the PEP detail textarea**

Find the PEP details block (inside `{pepSelf === true && (...)}`):

Replace:
```tsx
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={pepDetails}
                onChange={(e) =>
                  setValue("ind_pepSelfDetails", e.target.value)
                }
                placeholder="Describe your position or relationship to a PEP"
                rows={2}
                className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
              />
            </div>
```

With:
```tsx
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={pepDetails}
                onChange={(e) => setValue("ind_pepSelfDetails", e.target.value)}
                onBlur={() => touch("pepDetails")}
                placeholder="Describe your position or relationship to a PEP"
                rows={2}
                className={`w-full rounded-xl border bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f] ${
                  (touched.pepDetails || showValidationErrors) && !pepDetails.trim()
                    ? "border-red-500/40"
                    : "border-neutral-800"
                }`}
              />
              {(touched.pepDetails || showValidationErrors) && !pepDetails.trim() && (
                <p className="mt-1 text-xs text-red-400">Please provide details.</p>
              )}
            </div>
```

- [ ] **Step 3: Add blur + inline error to the sanctions detail textarea**

Find the sanctions details block (inside `{sanctionsSelf === true && (...)}`):

Replace:
```tsx
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={sanctionsDetails}
                onChange={(e) =>
                  setValue("ind_sanctionsSelfDetails", e.target.value)
                }
                placeholder="Describe the sanctions or restrictions"
                rows={2}
                className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
              />
            </div>
```

With:
```tsx
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={sanctionsDetails}
                onChange={(e) => setValue("ind_sanctionsSelfDetails", e.target.value)}
                onBlur={() => touch("sanctionsDetails")}
                placeholder="Describe the sanctions or restrictions"
                rows={2}
                className={`w-full rounded-xl border bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f] ${
                  (touched.sanctionsDetails || showValidationErrors) && !sanctionsDetails.trim()
                    ? "border-red-500/40"
                    : "border-neutral-800"
                }`}
              />
              {(touched.sanctionsDetails || showValidationErrors) && !sanctionsDetails.trim() && (
                <p className="mt-1 text-xs text-red-400">Please provide details.</p>
              )}
            </div>
```

- [ ] **Step 4: Add blur + inline error to the third-party detail textarea**

Find the third-party details block (inside `{thirdPartyUse === true && (...)}`):

Replace:
```tsx
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={thirdPartyDetails}
                onChange={(e) =>
                  setValue("ind_thirdPartyUseDetails", e.target.value)
                }
                placeholder="Describe who you will be acting on behalf of"
                rows={2}
                className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
              />
            </div>
```

With:
```tsx
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={thirdPartyDetails}
                onChange={(e) => setValue("ind_thirdPartyUseDetails", e.target.value)}
                onBlur={() => touch("thirdPartyDetails")}
                placeholder="Describe who you will be acting on behalf of"
                rows={2}
                className={`w-full rounded-xl border bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f] ${
                  (touched.thirdPartyDetails || showValidationErrors) && !thirdPartyDetails.trim()
                    ? "border-red-500/40"
                    : "border-neutral-800"
                }`}
              />
              {(touched.thirdPartyDetails || showValidationErrors) && !thirdPartyDetails.trim() && (
                <p className="mt-1 text-xs text-red-400">Please provide details.</p>
              )}
            </div>
```

- [ ] **Step 5: Update canGoNext for `riskDeclarations` in OnboardingRenderer**

Open `src/components/onboarding/OnboardingRenderer.tsx`. Find the `riskDeclarations` block (around line 508):

```tsx
    // Risk declarations step (individual accounts only)
    if (step.id === "riskDeclarations") {
      const hasPepAnswer = typeof answers.ind_pepSelf === "boolean";
      const hasSanctionsAnswer = typeof answers.ind_sanctionsSelf === "boolean";
      const hasThirdPartyAnswer = typeof answers.ind_thirdPartyUse === "boolean";

      return hasPepAnswer && hasSanctionsAnswer && hasThirdPartyAnswer && !isSubmittingStep;
    }
```

Replace with:
```tsx
    // Risk declarations step (individual accounts only)
    if (step.id === "riskDeclarations") {
      const hasPepAnswer = typeof answers.ind_pepSelf === "boolean";
      const hasSanctionsAnswer = typeof answers.ind_sanctionsSelf === "boolean";
      const hasThirdPartyAnswer = typeof answers.ind_thirdPartyUse === "boolean";

      const pepDetailsOk =
        answers.ind_pepSelf !== true ||
        (typeof answers.ind_pepSelfDetails === "string" &&
          answers.ind_pepSelfDetails.trim().length > 0);
      const sanctionsDetailsOk =
        answers.ind_sanctionsSelf !== true ||
        (typeof answers.ind_sanctionsSelfDetails === "string" &&
          answers.ind_sanctionsSelfDetails.trim().length > 0);
      const thirdPartyDetailsOk =
        answers.ind_thirdPartyUse !== true ||
        (typeof answers.ind_thirdPartyUseDetails === "string" &&
          answers.ind_thirdPartyUseDetails.trim().length > 0);

      return (
        hasPepAnswer &&
        hasSanctionsAnswer &&
        hasThirdPartyAnswer &&
        pepDetailsOk &&
        sanctionsDetailsOk &&
        thirdPartyDetailsOk &&
        !isSubmittingStep
      );
    }
```

- [ ] **Step 6: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/steps/RiskDeclarationsStep.tsx src/components/onboarding/OnboardingRenderer.tsx
git commit -m "feat(validation): blur validation for risk declaration details; block Next when details missing"
```

---

### Task 5: OwnershipStep — block Next when total ownership exceeds 100%

**Files:**
- Modify: `src/components/onboarding/steps/OwnershipStep.tsx`
- Modify: `src/components/onboarding/OnboardingRenderer.tsx`

Current state: `totalOwnership > 100` shows a `⚠ Exceeds 100%` warning inline, but there is no canGoNext block for the `"ownership"` step — users can click Next regardless. `ownershipDeclaration` is shown with a `*` on `showValidationErrors` but also has no canGoNext check.

- [ ] **Step 1: Sync `totalOwnership` into answers in OwnershipStep**

In `src/components/onboarding/steps/OwnershipStep.tsx`, find the line:
```tsx
  const totalOwnership = owners.reduce(
    (sum, o) => sum + (o.ownership_percentage || 0),
    0
  );
```

Immediately after that line, add a `useEffect` that writes the total into answers every time `owners` changes:
```tsx
  React.useEffect(() => {
    setValue("beneficialOwners_total_pct", totalOwnership);
  }, [totalOwnership]);
```

- [ ] **Step 2: Add `ownershipDeclaration` error indicator to the declaration radio label**

Find the declaration radio label in OwnershipStep (around line 1117):
```tsx
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-100 cursor-pointer">
          <input
            type="radio"
            name="ownershipDeclaration"
            style={{ accentColor: GOLD }}
            className="h-4 w-4 shrink-0"
            checked={answers.ownershipDeclaration === "agree"}
            onChange={() => setValue("ownershipDeclaration", "agree")}
          />
          <span>
            I confirm the ownership structure is complete and accurate.
            {showValidationErrors && answers.ownershipDeclaration !== "agree" && <span className="text-red-400"> *</span>}
          </span>
        </label>
```

This already shows the `*` error indicator — no change needed here.

- [ ] **Step 3: Add `"ownership"` canGoNext block in OnboardingRenderer**

Open `src/components/onboarding/OnboardingRenderer.tsx`. Find the final fallthrough `return !isSubmittingStep;` at the end of the `canGoNext` IIFE (around line 622):

```tsx
    return !isSubmittingStep;
  })();
```

Insert the new `"ownership"` block immediately before that fallthrough:
```tsx
    if (step.id === "ownership") {
      const totalPct = Number(answers.beneficialOwners_total_pct ?? 0);
      const declarationOk = answers.ownershipDeclaration === "agree";
      return totalPct <= 100 && declarationOk && !isSubmittingStep;
    }

    return !isSubmittingStep;
  })();
```

- [ ] **Step 4: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/steps/OwnershipStep.tsx src/components/onboarding/OnboardingRenderer.tsx
git commit -m "feat(validation): block Next on ownership step when total exceeds 100% or declaration missing"
```

---

### Task 6: AuthorisedPeopleStep — blur validation in PersonModal + canGoNext

**Files:**
- Modify: `src/components/onboarding/steps/AuthorisedPeopleStep.tsx`
- Modify: `src/components/onboarding/OnboardingRenderer.tsx`

Current state: PersonModal validates on Save click only (`handleSave` checks `full_name` required and email format). No inline blur feedback. The canGoNext IIFE has no `"authorisedPeople"` check so the fallthrough `return !isSubmittingStep` applies — that's correct since the step is optional (0 people is allowed), but it's not explicit.

- [ ] **Step 1: Import `isValidEmail` in AuthorisedPeopleStep**

Add to imports at the top of `AuthorisedPeopleStep.tsx`:
```tsx
import { isValidEmail } from "../validationUtils";
```

- [ ] **Step 2: Add `touched` state to PersonModal**

Inside the `PersonModal` component body (after the `const [saving, ...]` line), add:
```tsx
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));
```

- [ ] **Step 3: Derive inline errors from touched state**

After the `touch` helper, add:
```tsx
  const fullNameError =
    (touched.full_name || false) && !draft?.full_name?.trim()
      ? "Full name is required"
      : undefined;
  const emailError =
    (touched.email || false) && draft?.email && !isValidEmail(draft.email)
      ? "Please enter a valid email address"
      : undefined;
```

- [ ] **Step 4: Update Full Name FormField to show blur error**

In PersonModal JSX, find the Full Name `FormField`:
```tsx
          <FormField label="Full Name" required htmlFor="full_name">
            <Input
              id="full_name"
              value={draft.full_name}
              onChange={(value) => setDraft((prev) => prev && { ...prev, full_name: value })}
              placeholder="e.g. John Smith"
            />
          </FormField>
```

Replace with:
```tsx
          <FormField
            label="Full Name"
            required
            htmlFor="full_name"
            error={fullNameError}
            showError={!!fullNameError}
          >
            <Input
              id="full_name"
              value={draft.full_name}
              onChange={(value) => setDraft((prev) => prev && { ...prev, full_name: value })}
              onBlur={() => touch("full_name")}
              placeholder="e.g. John Smith"
            />
          </FormField>
```

- [ ] **Step 5: Update Email FormField to show blur error**

Find the Email `FormField`:
```tsx
          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={(value) => setDraft((prev) => prev && { ...prev, email: value })}
              placeholder="john@example.com"
            />
          </FormField>
```

Replace with:
```tsx
          <FormField
            label="Email"
            htmlFor="email"
            error={emailError}
            showError={!!emailError}
          >
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={(value) => setDraft((prev) => prev && { ...prev, email: value })}
              onBlur={() => touch("email")}
              placeholder="john@example.com"
            />
          </FormField>
```

- [ ] **Step 6: Add explicit `"authorisedPeople"` canGoNext block in OnboardingRenderer**

In `src/components/onboarding/OnboardingRenderer.tsx`, inside the canGoNext IIFE, add just before the `"ownership"` block inserted in Task 5:
```tsx
    if (step.id === "authorisedPeople") {
      return !isSubmittingStep;
    }
```

- [ ] **Step 7: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/onboarding/steps/AuthorisedPeopleStep.tsx src/components/onboarding/OnboardingRenderer.tsx
git commit -m "feat(validation): blur validation in authorized person modal"
```

---

### Task 7: RelationshipProfileStep — visual error indicators for required chip groups

**Files:**
- Modify: `src/components/onboarding/steps/RelationshipProfileStep.tsx`

Current state: `showValidationErrors` is in the Props type but the component destructures only `{ answers, setValue }` — the prop is silently dropped. No visual feedback when products or payment methods are empty and Next is clicked. The canGoNext block in OnboardingRenderer already correctly blocks, but the user gets no indication of _what_ is missing.

- [ ] **Step 1: Destructure `showValidationErrors` in the component**

Change the function signature from:
```tsx
export default function RelationshipProfileStep({ answers, setValue }: Props) {
```

To:
```tsx
export default function RelationshipProfileStep({ answers, setValue, showValidationErrors = false }: Props) {
```

- [ ] **Step 2: Add error text below the Products chip group**

Find the closing `</div>` of the products chip flex container and the `<div className="mt-3 text-[11px] text-neutral-500">` beneath it:
```tsx
        </div>

        <div className="mt-3 text-[11px] text-neutral-500">
          This reflects expected activity with us only.
        </div>
```

Replace with:
```tsx
        </div>

        {showValidationErrors && products.length === 0 && (
          <p className="mt-2 text-xs text-red-400">Please select at least one product.</p>
        )}
        <div className="mt-3 text-[11px] text-neutral-500">
          This reflects expected activity with us only.
        </div>
```

- [ ] **Step 3: Add error text below the Payment Methods chip group**

Find the closing `</div>` of the payment methods chip flex container:
```tsx
        <div className="mt-4 flex flex-wrap gap-2">
          {PAY_METHODS.map((opt) => {
```

After the `</div>` that closes this `flex flex-wrap gap-2` div (before the `{cashSelected ? (` block), add:
```tsx
        {showValidationErrors && paymentMethods.length === 0 && (
          <p className="mt-2 text-xs text-red-400">Please select at least one payment method.</p>
        )}
```

The payment methods section in full context — find this exact block and insert after the closing `</div>`:
```tsx
          {PAY_METHODS.map((opt) => {
            const selected = paymentMethods.includes(opt.value);
            return (
              <button
                ...
              >
                {opt.label}
              </button>
            );
          })}
        </div>
```

After that `</div>` insert:
```tsx
        {showValidationErrors && paymentMethods.length === 0 && (
          <p className="mt-2 text-xs text-red-400">Please select at least one payment method.</p>
        )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/steps/RelationshipProfileStep.tsx
git commit -m "feat(validation): show required-field errors on relationship profile chip groups"
```
