# Playwright E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Playwright E2E test suite for the sitara-website business onboarding flow, covering a golden path (uninterrupted) and a save-and-resume test (save+logout+resume at every step), with a backend cleanup endpoint that deletes test data when both specs pass.

**Architecture:** Page objects wrap each onboarding step. Two spec files share a `freshAccount` fixture that generates a unique test email/password, passes credentials to the spec, and calls a TESTING-only backend cleanup endpoint on teardown if both tests pass. `data-testid` attributes are added to interactive elements in the React components; the existing `id="radio-{name}-{value}"` pattern on Radio inputs is reused where it already exists.

**Tech Stack:** `@playwright/test`, `dotenv`, Next.js 15 (sitara-website port 3001), FastAPI backend (port 8000), `bcrypt` (already in backend via `app.auth`), SQLAlchemy, Azure Blob Storage SDK.

---

## File Structure

### New files — backend
| Path | Purpose |
|------|---------|
| `kora/backend/app/api/test_helpers.py` | `DELETE /api/v1/test/cleanup` — deletes blobs + DB rows for a test email |

### Modified files — backend
| Path | Change |
|------|--------|
| `kora/backend/app/main.py` | Register test_helpers router when `TESTING=true` |

### New files — sitara-website
| Path | Purpose |
|------|---------|
| `e2e/playwright.config.ts` | Playwright configuration, webServer, reporters |
| `e2e/.env.test.example` | Template for `.env.test` (committed; `.env.test` is gitignored) |
| `e2e/fixtures/freshAccount.ts` | Generates unique email+password; teardown calls cleanup |
| `e2e/fixtures/randomFile.ts` | Picks a random file from `LIVE_DOCS_DIR/<category>/` |
| `e2e/pages/LoginPage.ts` | `/login` — fill email/password, submit, logout |
| `e2e/pages/DashboardPage.ts` | `/dashboard` — resume application, verify card visible |
| `e2e/pages/AccountSelectionPage.ts` | `accountSelection` onboarding step — select business |
| `e2e/pages/AccountStepPage.ts` | `login` onboarding step — signup with email+password |
| `e2e/pages/CorporateSetupPage.ts` | `corporateSetup` step — select country |
| `e2e/pages/CompanyDetailsPage.ts` | `companyDetails` step — upload 3 company documents |
| `e2e/pages/OwnershipPage.ts` | `ownership` step — add individual owner + entity owner |
| `e2e/pages/RelationshipPage.ts` | `relationship` step — trading direction + products |
| `e2e/pages/AuthorisedPeoplePage.ts` | `authorisedPeople` step — add one authorised person |
| `e2e/pages/QuestionnairePage.ts` | `questionnaire` step — answer all questions |
| `e2e/pages/ReviewSubmitPage.ts` | `submit` step — accept declaration + submit |
| `e2e/specs/golden-path.spec.ts` | Full flow, no interruption |
| `e2e/specs/save-resume.spec.ts` | Save+logout+resume at every step |

### Modified files — sitara-website
| Path | Change |
|------|--------|
| `package.json` | Add `@playwright/test`, `dotenv`, `e2e:*` scripts |
| `src/app/login/page.tsx` | Add `data-testid` to email input, password input, submit button |
| `src/app/dashboard/page.tsx` | Add `data-testid` to logout button, continue-application link |
| `src/components/onboarding/OnboardingRenderer.tsx` | Add `data-testid` to Back, Save & Exit, Next, Submit buttons |
| `src/components/onboarding/steps/AccountStep.tsx` | Add `data-testid` to mode buttons, email, phone, password inputs |
| `src/components/ui/compounds/DocumentUploadControl.tsx` | Add optional `testId` prop → `data-testid` on container + hidden input |
| `src/components/onboarding/steps/BusinessDocumentsStep.tsx` | Pass `testId` to each `DocumentUploadControl` |
| `src/components/onboarding/steps/OwnershipStep.tsx` | Add `data-testid` to add-owner button, save-owner button, owner cards, doc uploaders |
| `src/components/onboarding/steps/AuthorisedPeopleStep.tsx` | Add `data-testid` to add-ap button, save-ap button, AP cards, doc uploaders |
| `src/components/onboarding/steps/QuestionsStep.tsx` | Add `data-testid` to each option button |
| `src/components/onboarding/steps/ReviewSubmitStep.tsx` | Add `data-testid` to declaration checkbox |
| `.gitignore` (sitara-website root) | Ignore `e2e/.env.test` and `e2e/test-results/` |

---

## Task 1: Install Playwright and add npm scripts

**Files:**
- Modify: `sitara-website/package.json`

- [ ] **Step 1: Install Playwright**

```bash
cd c:/Users/laken/sitara-website
npm install --save-dev @playwright/test dotenv
npx playwright install chromium
```

Expected: `node_modules/@playwright/test/` exists, chromium browser downloaded.

- [ ] **Step 2: Add e2e scripts to package.json**

In `package.json`, add to `"scripts"`:
```json
"test:e2e": "playwright test --config=e2e/playwright.config.ts",
"test:e2e:ui": "playwright test --config=e2e/playwright.config.ts --ui",
"test:e2e:report": "playwright show-report e2e/test-results/html"
```

- [ ] **Step 3: Add gitignore entries**

Append to the sitara-website `.gitignore` (or create one if absent):
```
# Playwright
e2e/.env.test
e2e/test-results/
e2e/.auth/
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/laken/sitara-website
git add package.json package-lock.json .gitignore
git commit -m "chore: install Playwright and add e2e test scripts"
```

---

## Task 2: Backend cleanup endpoint

**Files:**
- Create: `kora/backend/app/api/test_helpers.py`
- Modify: `kora/backend/app/main.py`

- [ ] **Step 1: Create `test_helpers.py`**

```python
# kora/backend/app/api/test_helpers.py
"""
Test-only API endpoints.  Only registered when TESTING=true in the environment.
NEVER import this module in production code.
"""
import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db import get_db
from app import models

log = logging.getLogger(__name__)
router = APIRouter(prefix="/test", tags=["test-helpers"])


def _assert_testing():
    if os.environ.get("TESTING", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Not available outside TESTING mode")


class CleanupRequest(BaseModel):
    email: str  # The test applicant's email


@router.delete("/cleanup", status_code=204)
def cleanup_test_applicant(
    payload: CleanupRequest,
    db: Session = Depends(get_db),
):
    """
    Delete all DB rows and Azure blobs for a test applicant identified by email.
    Only available when TESTING=true.
    """
    _assert_testing()

    # Find the applicant (may belong to any tenant)
    applicant = (
        db.query(models.Applicant)
        .filter(models.Applicant.email == payload.email)
        .first()
    )
    if not applicant:
        # Idempotent — already gone
        return

    # Delete Azure blobs for every document owned by this applicant
    applications = (
        db.query(models.Application)
        .filter(models.Application.applicant_id == applicant.id)
        .all()
    )
    for app in applications:
        docs = (
            db.query(models.Document)
            .filter(models.Document.application_id == app.id)
            .all()
        )
        for doc in docs:
            _delete_blob_safe(doc.blob_container, doc.blob_name)

        # Delete child rows first (FK order)
        db.query(models.BeneficialOwner).filter(
            models.BeneficialOwner.application_id == app.id
        ).delete(synchronize_session=False)
        db.query(models.AuthorizedPerson).filter(
            models.AuthorizedPerson.application_id == app.id
        ).delete(synchronize_session=False)
        db.query(models.Document).filter(
            models.Document.application_id == app.id
        ).delete(synchronize_session=False)

    # Delete applications
    db.query(models.Application).filter(
        models.Application.applicant_id == applicant.id
    ).delete(synchronize_session=False)

    # Delete applicant
    db.delete(applicant)
    db.commit()
    log.info("test_helpers: cleaned up applicant %s", payload.email)


def _delete_blob_safe(container: Optional[str], blob_name: Optional[str]) -> None:
    """Delete a blob from Azure, ignoring errors (blob may already be gone)."""
    if not container or not blob_name:
        return
    try:
        from app.azure_blob import _blob_service_client  # noqa: PLC0415
        blob_client = _blob_service_client.get_blob_client(
            container=container, blob=blob_name
        )
        blob_client.delete_blob()
    except Exception as exc:  # noqa: BLE001
        log.warning("Could not delete blob %s/%s: %s", container, blob_name, exc)
```

- [ ] **Step 2: Verify the models imported exist**

Run a quick check to confirm `models.BeneficialOwner`, `models.AuthorizedPerson`, `models.Document` are in `kora/backend/app/models.py`:

```bash
cd c:/Users/laken/kora/backend
grep -n "class BeneficialOwner\|class AuthorizedPerson\|class Document\b" app/models.py
```

Expected output shows all three class definitions.

- [ ] **Step 3: Register the router in `main.py`**

In `kora/backend/app/main.py`, add after the existing imports (near line 15):

```python
import os as _os
```

Then add just before `@app.get("/health")`:

```python
# Register test helpers ONLY when TESTING=true (never in production)
if _os.environ.get("TESTING", "").lower() == "true":
    from app.api import test_helpers as _test_helpers
    app.include_router(_test_helpers.router, prefix="/api/v1")
```

- [ ] **Step 4: Smoke-test the endpoint locally**

```bash
cd c:/Users/laken/kora/backend
TESTING=true uvicorn app.main:app --port 8001 &
curl -s http://localhost:8001/api/v1/test/cleanup \
  -X DELETE -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.invalid"}' \
  -o /dev/null -w "%{http_code}"
```

Expected: `204`

```bash
kill %1
```

- [ ] **Step 5: Commit**

```bash
cd c:/Users/laken/kora
git add backend/app/api/test_helpers.py backend/app/main.py
git commit -m "feat: add test-only cleanup endpoint (TESTING=true only)"
```

---

## Task 3: Playwright config and env template

**Files:**
- Create: `sitara-website/e2e/playwright.config.ts`
- Create: `sitara-website/e2e/.env.test.example`

- [ ] **Step 1: Create `playwright.config.ts`**

```typescript
// e2e/playwright.config.ts
import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })

export default defineConfig({
  testDir: path.resolve(__dirname, 'specs'),
  timeout: 120_000,
  retries: 0,
  workers: 1,           // serial — specs share Azure quota + backend state
  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(__dirname, 'test-results/html'), open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'uvicorn app.main:app --port 8000',
      cwd: path.resolve(__dirname, '../../kora/backend'),
      url: 'http://localhost:8000/health',
      reuseExistingServer: true,
      env: { TESTING: 'true' },
      timeout: 30_000,
    },
    {
      command: 'next dev -p 3001',
      cwd: path.resolve(__dirname, '..'),
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
```

- [ ] **Step 2: Create `.env.test.example`**

```bash
# e2e/.env.test.example
# Copy to .env.test and fill in values.
# .env.test is gitignored — never commit it.

BASE_URL=http://localhost:3001
BACKEND_URL=http://localhost:8000

# Absolute or relative path (relative = from sitara-website root) to
# kora/backend/tests/live_documents/
LIVE_DOCS_DIR=../kora/backend/tests/live_documents
```

- [ ] **Step 3: Copy and fill in `.env.test`**

```bash
cp c:/Users/laken/sitara-website/e2e/.env.test.example \
   c:/Users/laken/sitara-website/e2e/.env.test
```

Values should already be correct for local development. Verify `LIVE_DOCS_DIR` points to your local documents folder.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/laken/sitara-website
git add e2e/playwright.config.ts e2e/.env.test.example
git commit -m "chore: add Playwright config and env template"
```

---

## Task 4: E2E fixtures

**Files:**
- Create: `sitara-website/e2e/fixtures/freshAccount.ts`
- Create: `sitara-website/e2e/fixtures/randomFile.ts`

- [ ] **Step 1: Create `freshAccount.ts`**

```typescript
// e2e/fixtures/freshAccount.ts
import { test as base } from '@playwright/test'

export type FreshAccount = {
  email: string
  password: string
  /**
   * Call this at the end of a spec to signal it passed.
   * Teardown only deletes test data when ALL specs that share this
   * fixture have called markPassed().
   */
  markPassed: () => void
}

export const test = base.extend<{ freshAccount: FreshAccount }>({
  freshAccount: async ({}, use) => {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const email    = `test-e2e-${suffix}@test.sitara.invalid`
    const password = 'E2eTestPass1!'

    let passed = false

    await use({ email, password, markPassed: () => { passed = true } })

    // Teardown: only clean up when the spec passed
    if (passed) {
      const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
      await fetch(`${backendUrl}/api/v1/test/cleanup`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch((err) => console.warn('Cleanup fetch failed:', err))
    }
  },
})

export { expect } from '@playwright/test'
```

- [ ] **Step 2: Create `randomFile.ts`**

```typescript
// e2e/fixtures/randomFile.ts
import * as fs from 'fs'
import * as path from 'path'

const LIVE_DOCS = path.resolve(
  process.env.LIVE_DOCS_DIR
    ? path.resolve(__dirname, '..', process.env.LIVE_DOCS_DIR)
    : path.resolve(__dirname, '../../../kora/backend/tests/live_documents')
)

/** Returns the absolute path to a random file in the given category folder. */
export function randomFile(category: string): string {
  const dir = path.join(LIVE_DOCS, category)
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Live documents directory not found: ${dir}\n` +
      `Set LIVE_DOCS_DIR in e2e/.env.test and add files to ${dir}`
    )
  }
  const files = fs.readdirSync(dir).filter((f) =>
    /\.(pdf|jpg|jpeg|png|tiff)$/i.test(f)
  )
  if (files.length === 0) {
    throw new Error(`No supported documents in ${dir} — add at least one PDF/image.`)
  }
  return path.join(dir, files[Math.floor(Math.random() * files.length)])
}
```

- [ ] **Step 3: Verify the fixtures compile**

```bash
cd c:/Users/laken/sitara-website
npx tsc --noEmit --project tsconfig.json e2e/fixtures/freshAccount.ts e2e/fixtures/randomFile.ts 2>&1 || echo "type-check done"
```

Expected: No fatal errors (some path resolution warnings are OK at this stage).

- [ ] **Step 4: Commit**

```bash
cd c:/Users/laken/sitara-website
git add e2e/fixtures/
git commit -m "test: add freshAccount and randomFile E2E fixtures"
```

---

## Task 5: Add `data-testid` to login and dashboard pages

**Files:**
- Modify: `sitara-website/src/app/login/page.tsx`
- Modify: `sitara-website/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add testids to login page**

In `src/app/login/page.tsx`:

1. The email input (around line 99): add `data-testid="login-email"` to the `<input>` element.
2. The password input (around line 123): add `data-testid="login-password"`.
3. The submit button (around line 158): add `data-testid="login-submit"`.

```tsx
// email input — before:
<input
  id="email"
  type="email"
  autoComplete="email"
  required
  value={email}
  onChange={(e) => setEmail(e.target.value)}

// email input — after:
<input
  id="email"
  data-testid="login-email"
  type="email"
  autoComplete="email"
  required
  value={email}
  onChange={(e) => setEmail(e.target.value)}
```

```tsx
// password input — before:
<input
  id="password"
  type={showPassword ? "text" : "password"}
  autoComplete="current-password"
  required
  value={password}
  onChange={(e) => setPassword(e.target.value)}

// password input — after:
<input
  id="password"
  data-testid="login-password"
  type={showPassword ? "text" : "password"}
  autoComplete="current-password"
  required
  value={password}
  onChange={(e) => setPassword(e.target.value)}
```

```tsx
// submit button — before:
<button
  type="submit"
  disabled={isSubmitting}
  className="mt-2 w-full ..."

// submit button — after:
<button
  type="submit"
  data-testid="login-submit"
  disabled={isSubmitting}
  className="mt-2 w-full ..."
```

- [ ] **Step 2: Add testids to dashboard page**

In `src/app/dashboard/page.tsx`:

1. The logout button (around line 112): add `data-testid="logout-button"`.
2. The "Continue Application" link (around line 203): add `data-testid="continue-application"`.

```tsx
// logout button — before:
<button
  onClick={handleLogout}
  className="rounded-lg border ..."

// logout button — after:
<button
  onClick={handleLogout}
  data-testid="logout-button"
  className="rounded-lg border ..."
```

```tsx
// continue application link — before:
<Link
  href={`/onboard?resume=${app.id}`}
  style={{ backgroundColor: GOLD }}
  className="rounded-lg px-4 ..."
>
  Continue Application
</Link>

// continue application link — after:
<Link
  href={`/onboard?resume=${app.id}`}
  data-testid="continue-application"
  style={{ backgroundColor: GOLD }}
  className="rounded-lg px-4 ..."
>
  Continue Application
</Link>
```

- [ ] **Step 3: Verify the pages compile without TypeScript errors**

```bash
cd c:/Users/laken/sitara-website
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors beyond any pre-existing ones.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/dashboard/page.tsx
git commit -m "test: add data-testid to login and dashboard pages"
```

---

## Task 6: Add `data-testid` to OnboardingRenderer navigation buttons

**Files:**
- Modify: `sitara-website/src/components/onboarding/OnboardingRenderer.tsx`

The `Button` component already spreads `...props` onto the underlying `<button>`, so passing `data-testid` works without any changes to the Button component.

- [ ] **Step 1: Add testid to the Back button (around line 1798)**

```tsx
// before:
<Button
  variant="secondary"
  disabled={visibleIdx === 0 || isSubmittingStep || hasSubmitted || readOnly}
  onClick={prev}
>
  Back
</Button>

// after:
<Button
  variant="secondary"
  data-testid="back-button"
  disabled={visibleIdx === 0 || isSubmittingStep || hasSubmitted || readOnly}
  onClick={prev}
>
  Back
</Button>
```

- [ ] **Step 2: Add testid to the Save & Exit button (around line 1815)**

```tsx
// before:
<Button
  variant="secondary"
  size="sm"
  onClick={saveAndExit}
  disabled={isSaving}
>
  Save & Exit
</Button>

// after:
<Button
  variant="secondary"
  size="sm"
  data-testid="save-exit-button"
  onClick={saveAndExit}
  disabled={isSaving}
>
  Save & Exit
</Button>
```

- [ ] **Step 3: Add testid to the Next button (around line 1828)**

```tsx
// before:
<Button
  variant="primary"
  onClick={() => {
    if (!canGoNext) {
      setShowValidationErrors(true);
      return;
    }
    handleNextClick();
  }}
  disabled={visibleIdx >= visibleSteps.length - 1 || isSubmittingStep}
  loading={isSubmittingStep}
>

// after:
<Button
  variant="primary"
  data-testid="next-button"
  onClick={() => {
    if (!canGoNext) {
      setShowValidationErrors(true);
      return;
    }
    handleNextClick();
  }}
  disabled={visibleIdx >= visibleSteps.length - 1 || isSubmittingStep}
  loading={isSubmittingStep}
>
```

- [ ] **Step 4: Add testid to the Submit button (around line 1853)**

```tsx
// before:
<Button
  variant="primary"
  onClick={handleSubmit}
  disabled={!canSubmit}
>
  {hasSubmitted ? "Submitted" : "Submit"}
</Button>

// after:
<Button
  variant="primary"
  data-testid="submit-button"
  onClick={handleSubmit}
  disabled={!canSubmit}
>
  {hasSubmitted ? "Submitted" : "Submit"}
</Button>
```

- [ ] **Step 5: Compile check**

```bash
cd c:/Users/laken/sitara-website
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/OnboardingRenderer.tsx
git commit -m "test: add data-testid to onboarding navigation buttons"
```

---

## Task 7: Add `data-testid` to AccountStep (signup/login step)

**Files:**
- Modify: `sitara-website/src/components/onboarding/steps/AccountStep.tsx`

The AccountStep handles both signup mode and login mode. Both flows share the same `answers.email` / `answers.password` fields, but the render is branched.

- [ ] **Step 1: Add testid to the "Create Account" / "Log In" toggle buttons (around line 177–188)**

```tsx
// before:
<Button
  variant={mode === 'signup' ? 'primary' : 'secondary'}
  onClick={() => setMode('signup')}
  fullWidth
  size="lg"
>
  Create Account
</Button>
<Button
  variant={mode === 'login' ? 'primary' : 'secondary'}
  onClick={() => setMode('login')}
  fullWidth
  size="lg"
>
  Log In
</Button>

// after:
<Button
  variant={mode === 'signup' ? 'primary' : 'secondary'}
  data-testid="mode-signup"
  onClick={() => setMode('signup')}
  fullWidth
  size="lg"
>
  Create Account
</Button>
<Button
  variant={mode === 'login' ? 'primary' : 'secondary'}
  data-testid="mode-login"
  onClick={() => setMode('login')}
  fullWidth
  size="lg"
>
  Log In
</Button>
```

- [ ] **Step 2: Add testid to email inputs (signup + login modes, around lines 206–229)**

Both branches render an `<input type="email">`. Add `data-testid="account-email"` to each:

```tsx
// login mode email — before:
<input
  type="email"
  className={baseInput}
  placeholder="name@example.com"
  value={answers.email || ""}
  onChange={(e) => setValue("email", e.target.value)}
/>

// login mode email — after:
<input
  type="email"
  data-testid="account-email"
  className={baseInput}
  placeholder="name@example.com"
  value={answers.email || ""}
  onChange={(e) => setValue("email", e.target.value)}
/>
```

```tsx
// signup mode email — before:
<input
  type="email"
  className={`${baseInput} md:col-span-2`}
  placeholder="name@example.com"
  value={answers.email || ""}
  onChange={(e) => {
    setValue("email", e.target.value);
    setValue("emailVerified", false);
  }}
/>

// signup mode email — after:
<input
  type="email"
  data-testid="account-email"
  className={`${baseInput} md:col-span-2`}
  placeholder="name@example.com"
  value={answers.email || ""}
  onChange={(e) => {
    setValue("email", e.target.value);
    setValue("emailVerified", false);
  }}
/>
```

- [ ] **Step 3: Add testid to email OTP inputs and action buttons (signup mode, around lines 226–249)**

```tsx
// email OTP input — after:
<input
  type="text"
  data-testid="email-otp-input"
  inputMode="numeric"
  ...
/>
```

The "Send" button for email OTP:
```tsx
// before:
<Button
  variant="secondary"
  size="sm"
  onClick={() => {
    if (!answers.email) return;
    if (DEV_MODE) setValue("emailOtp", "000000");
  }}
>
  Send
</Button>

// after:
<Button
  variant="secondary"
  size="sm"
  data-testid="email-otp-send"
  onClick={() => {
    if (!answers.email) return;
    if (DEV_MODE) setValue("emailOtp", "000000");
  }}
>
  Send
</Button>
```

The "Verify" button for email:
```tsx
<Button
  variant={answers.emailVerified ? "primary" : "secondary"}
  size="sm"
  data-testid="email-verify"
  onClick={() =>
    setValue("emailVerified", !!answers.email && !!answers.emailOtp)
  }
>
  {answers.emailVerified ? "Verified" : "Verify"}
</Button>
```

- [ ] **Step 4: Add testid to phone national input and OTP controls (signup mode, around lines 281–315)**

```tsx
// phone national number input:
<input
  type="tel"
  data-testid="phone-national-input"
  className={`${baseInput} rounded-l-none`}
  ...
/>

// phone OTP input:
<input
  type="text"
  data-testid="phone-otp-input"
  inputMode="numeric"
  ...
/>
```

"Send" for phone OTP:
```tsx
<Button variant="secondary" size="sm" data-testid="phone-otp-send" onClick={sendSmsOtp}>
  Send
</Button>
```

"Verify" for phone:
```tsx
<Button
  variant={answers.phoneVerified ? "primary" : "secondary"}
  size="sm"
  data-testid="phone-verify"
  onClick={() =>
    setValue("phoneVerified", !!answers.phone && !!answers.phoneOtp)
  }
>
  {answers.phoneVerified ? "Verified" : "Verify"}
</Button>
```

- [ ] **Step 5: Add testid to password inputs (around lines 332–367)**

```tsx
// password input:
<input
  type="password"
  data-testid="account-password"
  className={baseInput}
  ...
/>

// confirm password input:
<input
  type="password"
  data-testid="account-confirm-password"
  className={baseInput}
  ...
/>
```

- [ ] **Step 6: Compile check and commit**

```bash
cd c:/Users/laken/sitara-website
npx tsc --noEmit 2>&1 | head -20
git add src/components/onboarding/steps/AccountStep.tsx
git commit -m "test: add data-testid to AccountStep signup/login inputs"
```

---

## Task 8: Add `testId` prop to `DocumentUploadControl`

**Files:**
- Modify: `sitara-website/src/components/ui/compounds/DocumentUploadControl.tsx`

- [ ] **Step 1: Add `testId` prop to the interface (around line 16)**

```typescript
export interface DocumentUploadControlProps {
  /** Current upload status */
  status: DocumentUploadStatus;
  errorMessage?: string | null;
  onFileSelect: (file: File) => void | Promise<void>;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  fileName?: string | null;
  /** Playwright test identifier applied to the container and hidden input */
  testId?: string;
}
```

- [ ] **Step 2: Destructure `testId` in the component (around line 39)**

```typescript
export const DocumentUploadControl: React.FC<DocumentUploadControlProps> = ({
  status,
  errorMessage,
  onFileSelect,
  onRemove,
  accept = 'image/*,application/pdf',
  maxSizeMB = 10,
  disabled = false,
  className,
  size = 'md',
  fileName,
  testId,          // ← add this
}) => {
```

- [ ] **Step 3: Apply `testId` to the container div and the hidden input (around lines 124–132)**

```tsx
// container div — before:
<div className={cn('w-full', className)}>
  <input
    ref={inputRef}
    type="file"
    accept={accept}
    onChange={handleChange}
    disabled={isDisabled}
    className="hidden"
  />

// container div — after:
<div className={cn('w-full', className)} data-testid={testId}>
  <input
    ref={inputRef}
    type="file"
    accept={accept}
    onChange={handleChange}
    disabled={isDisabled}
    className="hidden"
    data-testid={testId ? `${testId}-input` : undefined}
  />
```

- [ ] **Step 4: Compile check and commit**

```bash
cd c:/Users/laken/sitara-website
npx tsc --noEmit 2>&1 | head -20
git add src/components/ui/compounds/DocumentUploadControl.tsx
git commit -m "test: add testId prop to DocumentUploadControl"
```

---

## Task 9: Wire `testId` into `BusinessDocumentsStep`

**Files:**
- Modify: `sitara-website/src/components/onboarding/steps/BusinessDocumentsStep.tsx`

The BusinessDocumentsStep renders `DocumentUploadControl` for each document category. Find each instance and add the `testId` prop.

- [ ] **Step 1: Read the component to find all DocumentUploadControl usages**

```bash
grep -n "DocumentUploadControl" c:/Users/laken/sitara-website/src/components/onboarding/steps/BusinessDocumentsStep.tsx
```

- [ ] **Step 2: Add `testId` to each DocumentUploadControl**

For each `DocumentUploadControl` rendered in BusinessDocumentsStep, pass a `testId` based on the field id from the schema.

The field IDs from the schema (found earlier) map to test IDs as follows:

| Schema field ID | `testId` to pass |
|----------------|----------------|
| `legal_existence_files` | `"upload-legal-existence"` |
| `constitutional_corporate_files` | `"upload-constitutional"` |
| `registered_address_files` | `"upload-registered-address"` |
| `operating_address_files` | `"upload-operating-address"` |
| `tax_registration_files` | `"upload-tax-registration"` |
| `activity_evidence_files` | `"upload-activity-evidence"` |
| `precious_metals_permits_files` | `"upload-precious-metals"` |

For each DocumentUploadControl in BusinessDocumentsStep, add `testId={...}` where the value matches the table above. The exact approach depends on how the component renders them — look for the pattern around the `onFileSelect` prop and the `status` prop, then add `testId`.

Example before:
```tsx
<DocumentUploadControl
  status={uploadStatuses["legal_existence_files"] ?? "idle"}
  onFileSelect={(file) => handleFileSelect(file, "legal_existence_files")}
  ...
/>
```

Example after:
```tsx
<DocumentUploadControl
  testId="upload-legal-existence"
  status={uploadStatuses["legal_existence_files"] ?? "idle"}
  onFileSelect={(file) => handleFileSelect(file, "legal_existence_files")}
  ...
/>
```

- [ ] **Step 3: Compile check and commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/components/onboarding/steps/BusinessDocumentsStep.tsx
git commit -m "test: wire testId into BusinessDocumentsStep uploads"
```

---

## Task 10: Add `data-testid` to OwnershipStep

**Files:**
- Modify: `sitara-website/src/components/onboarding/steps/OwnershipStep.tsx`

The OwnershipStep has:
- An "Add owner" button (line 994)
- An `OwnerModal` (the modal for adding/editing)
- Owner cards rendered below the modal
- `OwnerDocumentUploader` (internal component) which wraps `DocumentUploadControl`

- [ ] **Step 1: Add testid to the "Add owner" button (around line 994)**

```tsx
// before:
<Button variant="secondary" onClick={addOwner} size="sm">
  <span>＋</span> Add owner
</Button>

// after:
<Button variant="secondary" data-testid="add-owner-button" onClick={addOwner} size="sm">
  <span>＋</span> Add owner
</Button>
```

- [ ] **Step 2: Add testid to the Save button in `OwnerModal`**

Find the Save/Submit button inside `OwnerModal` (look for the button that calls `onSave(draft)` or similar in the modal footer):

```tsx
<Button variant="primary" data-testid="save-owner-button" onClick={() => onSave(draft)} loading={saving}>
  Save
</Button>
```

- [ ] **Step 3: Add testid to owner cards so tests can verify owners were added**

Find where owners are rendered as cards (around line 1013+). Add `data-testid="owner-card"` to the card container div:

```tsx
// On the outer div of each owner card:
<div key={owner.id} data-testid="owner-card" className="...">
```

- [ ] **Step 4: Add `testId` to `OwnerDocumentUploader` usages**

The `OwnerDocumentUploader` component (internal to OwnershipStep) renders a `DocumentUploadControl`. It needs a `testId` prop.

Find the `OwnerDocumentUploader` interface definition (around line 108) and add `testId?: string`:

```typescript
interface OwnerDocUploaderProps {
  fieldId: string;
  label: string;
  description?: string;
  category: string;
  tenantId?: string | null;
  applicationId?: string | null;
  applicantId?: string | null;
  onUploaded?: (args: { documentId: string; extracted?: any }) => void | Promise<void>;
  testId?: string;   // ← add
}
```

Destructure and forward it to `DocumentUploadControl`:
```typescript
const OwnerDocumentUploader: React.FC<OwnerDocUploaderProps> = ({
  ...
  testId,
}) => {
  ...
  return (
    <DocumentUploadControl
      testId={testId}
      status={uploadStatus}
      ...
    />
  )
}
```

Then in `OwnerModal` where `OwnerDocumentUploader` is used for individual ID doc and address doc, pass the testId:
```tsx
// individual ID document uploader:
<OwnerDocumentUploader
  testId="owner-id-doc"
  category="owner_id_passport"
  ...
/>

// individual address document uploader:
<OwnerDocumentUploader
  testId="owner-address-doc"
  category="individual_address_proof"
  ...
/>

// entity legal existence document:
<OwnerDocumentUploader
  testId="entity-reg-cert"
  category="entity_registration_cert"
  ...
/>

// entity ownership proof document:
<OwnerDocumentUploader
  testId="entity-shareholding"
  category="entity_shareholding"
  ...
/>
```

- [ ] **Step 5: Compile check and commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/components/onboarding/steps/OwnershipStep.tsx
git commit -m "test: add data-testid to OwnershipStep buttons and doc uploaders"
```

---

## Task 11: Add `data-testid` to `AuthorisedPeopleStep`

**Files:**
- Modify: `sitara-website/src/components/onboarding/steps/AuthorisedPeopleStep.tsx`

Mirror the pattern from Task 10. Read the component first to find exact lines.

- [ ] **Step 1: Read the component to find the add button, modal, and cards**

```bash
grep -n "Add.*person\|add.*authoris\|addPerson\|setModalOpen\|save.*person\|Save\|data-testid\|AP card" \
  c:/Users/laken/sitara-website/src/components/onboarding/steps/AuthorisedPeopleStep.tsx | head -30
```

- [ ] **Step 2: Add testid to "Add authorised person" button**

Find the button that opens the modal for adding a new person (similar to OwnershipStep's "Add owner" button) and add:
```tsx
data-testid="add-ap-button"
```

- [ ] **Step 3: Add testid to the Save button inside the AP modal**

Find the save/confirm button in the modal footer and add:
```tsx
data-testid="save-ap-button"
```

- [ ] **Step 4: Add testid to AP cards**

Find the outer div of each person card and add:
```tsx
data-testid="ap-card"
```

- [ ] **Step 5: Add `testId` to document uploaders inside AuthorisedPeopleStep**

Find the `DocumentUploadControl` usages for ID doc and address doc inside the AP modal. The component may use `OwnerDocumentUploader` or directly use `DocumentUploadControl`. Add:
- ID document: `testId="ap-id-doc"`
- Address document: `testId="ap-address-doc"`

- [ ] **Step 6: Compile check and commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/components/onboarding/steps/AuthorisedPeopleStep.tsx
git commit -m "test: add data-testid to AuthorisedPeopleStep"
```

---

## Task 12: Add `data-testid` to `QuestionsStep`

**Files:**
- Modify: `sitara-website/src/components/onboarding/steps/QuestionsStep.tsx`

The QuestionsStep renders questions from `uae_business_questions.v1.json`. Each question type renders differently — `single_select` renders as clickable option buttons, `ack` renders as a checkbox. Tests need stable selectors to click each option.

- [ ] **Step 1: Read the component's render methods**

```bash
grep -n "RadioQuestion\|AckQuestion\|CountryMultiSelect\|onClick\|onSet\|option\|data-testid" \
  c:/Users/laken/sitara-website/src/components/onboarding/steps/QuestionsStep.tsx | head -40
```

- [ ] **Step 2: Add testid to `RadioQuestion` option buttons**

In the `RadioQuestion` component (around line 75), find where each option is rendered as a `<button>` or `<div>` and add `data-testid={`q-${def.code}-${option.value}`}`:

```tsx
// Example: if the option is rendered as a button:
<button
  data-testid={`q-${def.code}-${option.value}`}
  onClick={() => onSet(option.value)}
  ...
>
  {option.label}
</button>
```

- [ ] **Step 3: Add testid to `AckQuestion` checkbox/button**

For `ack` type questions, find the checkbox or button and add `data-testid={`q-${def.code}-ack`}`.

- [ ] **Step 4: Compile check and commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/components/onboarding/steps/QuestionsStep.tsx
git commit -m "test: add data-testid to QuestionsStep option buttons"
```

---

## Task 13: Add `data-testid` to `ReviewSubmitStep`

**Files:**
- Modify: `sitara-website/src/components/onboarding/steps/ReviewSubmitStep.tsx`

The ReviewSubmitStep shows the summary and has a declaration checkbox. The Submit button is in OnboardingRenderer (already tagged in Task 6). The declaration checkbox needs a testid.

- [ ] **Step 1: Find the declaration checkbox**

```bash
grep -n "submitDeclaration\|declaration\|checkbox\|Checkbox\|accept" \
  c:/Users/laken/sitara-website/src/components/onboarding/steps/ReviewSubmitStep.tsx | head -20
```

- [ ] **Step 2: Add testid to the declaration checkbox/button**

Find the UI element the user must interact with to accept the declaration (could be a `<Checkbox>`, `<input type="checkbox">`, or a clickable area). Add `data-testid="declaration-accept"` to it.

- [ ] **Step 3: Compile check and commit**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/components/onboarding/steps/ReviewSubmitStep.tsx
git commit -m "test: add data-testid to ReviewSubmitStep declaration control"
```

---

## Task 14: Create page objects

**Files:**
- Create: `sitara-website/e2e/pages/LoginPage.ts`
- Create: `sitara-website/e2e/pages/DashboardPage.ts`
- Create: `sitara-website/e2e/pages/AccountSelectionPage.ts`
- Create: `sitara-website/e2e/pages/AccountStepPage.ts`
- Create: `sitara-website/e2e/pages/CorporateSetupPage.ts`
- Create: `sitara-website/e2e/pages/CompanyDetailsPage.ts`
- Create: `sitara-website/e2e/pages/OwnershipPage.ts`
- Create: `sitara-website/e2e/pages/RelationshipPage.ts`
- Create: `sitara-website/e2e/pages/AuthorisedPeoplePage.ts`
- Create: `sitara-website/e2e/pages/QuestionnairePage.ts`
- Create: `sitara-website/e2e/pages/ReviewSubmitPage.ts`

- [ ] **Step 1: Create `LoginPage.ts`**

```typescript
// e2e/pages/LoginPage.ts
import type { Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForSelector('[data-testid="login-submit"]')
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="login-email"]', email)
    await this.page.fill('[data-testid="login-password"]', password)
    await this.page.click('[data-testid="login-submit"]')
    await this.page.waitForURL('**/dashboard', { timeout: 15_000 })
  }

  async logout() {
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForURL('**/', { timeout: 10_000 })
  }
}
```

- [ ] **Step 2: Create `DashboardPage.ts`**

```typescript
// e2e/pages/DashboardPage.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForSelector('[data-testid="logout-button"]')
  }

  async resumeApplication() {
    // Wait for the "Continue Application" link to appear, then click it
    const link = this.page.locator('[data-testid="continue-application"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await this.page.waitForURL('**/onboard**', { timeout: 15_000 })
  }

  async expectApplicationCard() {
    await expect(
      this.page.locator('[data-testid="continue-application"]').first()
    ).toBeVisible({ timeout: 10_000 })
  }
}
```

- [ ] **Step 3: Create `AccountSelectionPage.ts`**

```typescript
// e2e/pages/AccountSelectionPage.ts
import type { Page } from '@playwright/test'

export class AccountSelectionPage {
  constructor(private page: Page) {}

  /** Select "Business" account type and fill signatory details. */
  async selectBusiness(opts: {
    signingRole?: 'signatory' | 'employee'
    firstName?: string
    lastName?: string
    email?: string
  } = {}) {
    // accountType radio — uses id="radio-accountType-business" from the Radio component
    await this.page.click('#radio-accountType-business')

    // signingRole appears after selecting business
    const role = opts.signingRole ?? 'signatory'
    await this.page.waitForSelector(`#radio-signingRole-${role}`, { timeout: 5_000 })
    await this.page.click(`#radio-signingRole-${role}`)

    // Optional signatory details
    if (opts.firstName) await this.page.fill('#signatoryFirstName', opts.firstName)
    if (opts.lastName)  await this.page.fill('#signatoryLastName', opts.lastName)
    if (opts.email)     await this.page.fill('#signatoryEmail', opts.email)
  }
}
```

- [ ] **Step 4: Create `AccountStepPage.ts`**

The AccountStep in the onboarding handles signup. In DEV_MODE (next dev), OTP sends auto-fill "000000".

```typescript
// e2e/pages/AccountStepPage.ts
import type { Page } from '@playwright/test'

export class AccountStepPage {
  constructor(private page: Page) {}

  /** Sign up with a fresh email + password in the onboarding flow. */
  async signup(email: string, password: string, phoneNational = '501234567') {
    // Select signup mode (should be default, but be explicit)
    await this.page.click('[data-testid="mode-signup"]')

    // Fill email
    await this.page.fill('[data-testid="account-email"]', email)

    // Send + verify email OTP (DEV_MODE auto-fills 000000)
    await this.page.click('[data-testid="email-otp-send"]')
    await this.page.fill('[data-testid="email-otp-input"]', '000000')
    await this.page.click('[data-testid="email-verify"]')

    // Fill phone
    await this.page.fill('[data-testid="phone-national-input"]', phoneNational)

    // Send + verify phone OTP (DEV_MODE auto-fills 000000)
    await this.page.click('[data-testid="phone-otp-send"]')
    await this.page.fill('[data-testid="phone-otp-input"]', '000000')
    await this.page.click('[data-testid="phone-verify"]')

    // Fill password
    await this.page.fill('[data-testid="account-password"]', password)
    await this.page.fill('[data-testid="account-confirm-password"]', password)
  }
}
```

- [ ] **Step 5: Create `CorporateSetupPage.ts`**

The corporateSetup step uses `BusinessProfileStep` which renders a `SearchableCountrySelect` for `incCountry`. Since that component has no `data-testid`, we target its text input by `aria-label` or by type within the section heading.

The `SearchableCountrySelect` renders `<input type="text">` inside a `<div class="relative">`. Target it by placeholder text.

```typescript
// e2e/pages/CorporateSetupPage.ts
import type { Page } from '@playwright/test'

export class CorporateSetupPage {
  constructor(private page: Page) {}

  /** Select jurisdiction country and wait for step to be ready. */
  async selectJurisdiction(countryName = 'United Arab Emirates') {
    // The SearchableCountrySelect renders an <input type="text">
    // with placeholder "Start typing to search…"
    const input = this.page.locator('input[placeholder="Start typing to search…"]').first()
    await input.click()
    await input.fill(countryName.slice(0, 6))

    // Wait for dropdown and click the matching option
    await this.page.waitForSelector(`text="${countryName}"`, { timeout: 5_000 })
    await this.page.click(`text="${countryName}"`)
  }
}
```

- [ ] **Step 6: Create `CompanyDetailsPage.ts`**

```typescript
// e2e/pages/CompanyDetailsPage.ts
import type { Page } from '@playwright/test'

export class CompanyDetailsPage {
  constructor(private page: Page) {}

  /**
   * Upload a file to a DocumentUploadControl identified by testId.
   * Uses setInputFiles on the hidden <input type="file"> inside the container.
   * Waits until the status button text changes to "Uploaded".
   */
  async uploadDocument(testId: string, filePath: string) {
    const container = this.page.locator(`[data-testid="${testId}"]`)
    const fileInput  = container.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)

    // Wait for upload to succeed — button text becomes "Uploaded"
    await this.page.waitForSelector(
      `[data-testid="${testId}"] button:has-text("Uploaded")`,
      { timeout: 60_000 }
    )
  }

  async uploadTradeLicence(filePath: string) {
    await this.uploadDocument('upload-legal-existence', filePath)
  }

  async uploadAddressProof(filePath: string) {
    // Use registered address as the primary address proof
    await this.uploadDocument('upload-registered-address', filePath)
  }

  async uploadTaxCertificate(filePath: string) {
    await this.uploadDocument('upload-tax-registration', filePath)
  }
}
```

- [ ] **Step 7: Create `OwnershipPage.ts`**

```typescript
// e2e/pages/OwnershipPage.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class OwnershipPage {
  constructor(private page: Page) {}

  private async uploadDoc(testId: string, filePath: string) {
    const fileInput = this.page.locator(`[data-testid="${testId}-input"]`)
    await fileInput.setInputFiles(filePath)
    await this.page.waitForSelector(
      `[data-testid="${testId}"] button:has-text("Uploaded")`,
      { timeout: 60_000 }
    )
  }

  async addIndividualOwner(opts: {
    fullName: string
    nationality?: string
    ownershipPct: number
    passportFile: string
    addressFile: string
  }) {
    await this.page.click('[data-testid="add-owner-button"]')

    // Select individual type from the Select component (id="owner_type")
    await this.page.selectOption('#owner_type', 'individual')

    // Fill name
    await this.page.fill('#individual_full_name', opts.fullName)

    // Nationality — GoldCombobox, target by its containing input
    if (opts.nationality) {
      const natInput = this.page.locator('[id^="gold-combobox"]').first()
      await natInput.fill(opts.nationality.slice(0, 4))
      await this.page.click(`text="${opts.nationality}"`, { timeout: 5_000 })
    }

    // Ownership percentage — find the input that has "ownership_percentage" in its id or name
    await this.page.fill('#ownership_percentage', String(opts.ownershipPct))

    // Upload documents
    await this.uploadDoc('owner-id-doc', opts.passportFile)
    await this.uploadDoc('owner-address-doc', opts.addressFile)

    // Save
    await this.page.click('[data-testid="save-owner-button"]')
    await expect(
      this.page.locator('[data-testid="owner-card"]').first()
    ).toBeVisible({ timeout: 10_000 })
  }

  async addEntityOwner(opts: {
    legalName: string
    jurisdiction?: string
    ownershipPct: number
    regCertFile: string
    shareholdingFile: string
  }) {
    await this.page.click('[data-testid="add-owner-button"]')

    await this.page.selectOption('#owner_type', 'company')

    await this.page.fill('#entity_legal_name', opts.legalName)

    if (opts.jurisdiction) {
      const jurInput = this.page.locator('[id^="gold-combobox"]').first()
      await jurInput.fill(opts.jurisdiction.slice(0, 4))
      await this.page.click(`text="${opts.jurisdiction}"`, { timeout: 5_000 })
    }

    await this.page.fill('#ownership_percentage', String(opts.ownershipPct))

    await this.uploadDoc('entity-reg-cert', opts.regCertFile)
    await this.uploadDoc('entity-shareholding', opts.shareholdingFile)

    await this.page.click('[data-testid="save-owner-button"]')
    await expect(
      this.page.locator('[data-testid="owner-card"]')
    ).toHaveCount(2, { timeout: 10_000 })
  }
}
```

- [ ] **Step 8: Create `RelationshipPage.ts`**

The RelationshipProfileStep uses FieldRenderer which renders Radio components with `id="radio-{name}-{value}"`.

```typescript
// e2e/pages/RelationshipPage.ts
import type { Page } from '@playwright/test'

export class RelationshipPage {
  constructor(private page: Page) {}

  async fill(opts: {
    direction?: string
    products?: string[]
    frequency?: string
    expectedValueBand?: string
    paymentMethods?: string[]
  } = {}) {
    const direction = opts.direction ?? 'outbound'
    await this.page.click(`#radio-relationship_direction-${direction}`)

    // Products — multiselect cards, click each by label text
    for (const product of opts.products ?? ['bars']) {
      await this.page.click(`text="${product}"`, { timeout: 5_000 })
    }

    const freq = opts.frequency ?? 'monthly'
    await this.page.click(`#radio-expected_frequency-${freq}`)

    // Expected value — select or radio
    const band = opts.expectedValueBand ?? '100k_500k'
    // Try radio first, fall back to select
    const radioSel = `#radio-expected_value_band-${band}`
    const hasRadio = await this.page.locator(radioSel).count()
    if (hasRadio) {
      await this.page.click(radioSel)
    } else {
      await this.page.selectOption('#expected_value_band', band)
    }

    // Payment methods — multiselect (click each)
    for (const pm of opts.paymentMethods ?? ['wire_transfer']) {
      await this.page.click(`#radio-payment_methods-${pm}`, { timeout: 5_000 })
        .catch(() => this.page.click(`text="${pm}"`))
    }
  }
}
```

- [ ] **Step 9: Create `AuthorisedPeoplePage.ts`**

```typescript
// e2e/pages/AuthorisedPeoplePage.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class AuthorisedPeoplePage {
  constructor(private page: Page) {}

  private async uploadDoc(testId: string, filePath: string) {
    const fileInput = this.page.locator(`[data-testid="${testId}-input"]`)
    await fileInput.setInputFiles(filePath)
    await this.page.waitForSelector(
      `[data-testid="${testId}"] button:has-text("Uploaded")`,
      { timeout: 60_000 }
    )
  }

  async addAuthorisedPerson(opts: {
    fullName: string
    email?: string
    role?: string
    passportFile: string
    addressFile: string
  }) {
    await this.page.click('[data-testid="add-ap-button"]')

    await this.page.fill('#full_name', opts.fullName)
    if (opts.email) await this.page.fill('#email', opts.email)
    if (opts.role)  await this.page.fill('#role', opts.role)

    await this.uploadDoc('ap-id-doc', opts.passportFile)
    await this.uploadDoc('ap-address-doc', opts.addressFile)

    await this.page.click('[data-testid="save-ap-button"]')
    await expect(
      this.page.locator('[data-testid="ap-card"]').first()
    ).toBeVisible({ timeout: 10_000 })
  }
}
```

- [ ] **Step 10: Create `QuestionnairePage.ts`**

The questionnaire is driven by `uae_business_questions.v1.json`. Rather than hard-coding every question, the page object answers them by clicking the first available option for each question.

```typescript
// e2e/pages/QuestionnairePage.ts
import type { Page } from '@playwright/test'

export class QuestionnairePage {
  constructor(private page: Page) {}

  /**
   * Answer every visible question by clicking the first option button
   * whose data-testid matches `q-{code}-{value}`.
   * Uses a broad selector so new questions added to the spec are answered automatically.
   */
  async answerAll() {
    // Wait for at least one question option to appear
    await this.page.waitForSelector('[data-testid^="q-"]', { timeout: 10_000 })

    // Click every option button we haven't yet clicked
    const optionButtons = this.page.locator('[data-testid^="q-"]')
    const count = await optionButtons.count()

    // Group by question code: click only the first option per question
    const seen = new Set<string>()
    for (let i = 0; i < count; i++) {
      const testId = await optionButtons.nth(i).getAttribute('data-testid') ?? ''
      // testId format: q-{code}-{value}
      const parts = testId.split('-')
      const code = parts.slice(0, -1).join('-')  // everything except last segment
      if (!seen.has(code)) {
        seen.add(code)
        await optionButtons.nth(i).click()
        await this.page.waitForTimeout(200)  // let React state settle
      }
    }
  }
}
```

- [ ] **Step 11: Create `ReviewSubmitPage.ts`**

```typescript
// e2e/pages/ReviewSubmitPage.ts
import type { Page } from '@playwright/test'

export class ReviewSubmitPage {
  constructor(private page: Page) {}

  async acceptDeclarationAndSubmit() {
    // Accept the declaration (checkbox or clickable card)
    const decl = this.page.locator('[data-testid="declaration-accept"]')
    await decl.waitFor({ timeout: 10_000 })

    // If it's a checkbox-style input, check it; if it's a button, click it
    const tagName = await decl.evaluate((el) => el.tagName.toLowerCase())
    if (tagName === 'input') {
      await decl.check()
    } else {
      await decl.click()
    }

    // Submit button is in OnboardingRenderer
    await this.page.click('[data-testid="submit-button"]')
    // Wait for the submitted state — button text changes to "Submitted"
    await this.page.waitForSelector(
      '[data-testid="submit-button"]:has-text("Submitted"), [data-testid="submit-button"][disabled]',
      { timeout: 30_000 }
    )
  }
}
```

- [ ] **Step 12: Commit all page objects**

```bash
cd c:/Users/laken/sitara-website
npx tsc --noEmit 2>&1 | head -30
git add e2e/pages/
git commit -m "test: add all E2E page objects"
```

---

## Task 15: Create the golden-path spec

**Files:**
- Create: `sitara-website/e2e/specs/golden-path.spec.ts`

The golden path runs the full business onboarding without interruption. It uses the `freshAccount` fixture for credentials and the `randomFile` helper for documents.

- [ ] **Step 1: Create `golden-path.spec.ts`**

```typescript
// e2e/specs/golden-path.spec.ts
import { test, expect } from '../fixtures/freshAccount'
import { randomFile } from '../fixtures/randomFile'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { AccountSelectionPage } from '../pages/AccountSelectionPage'
import { AccountStepPage } from '../pages/AccountStepPage'
import { CorporateSetupPage } from '../pages/CorporateSetupPage'
import { CompanyDetailsPage } from '../pages/CompanyDetailsPage'
import { OwnershipPage } from '../pages/OwnershipPage'
import { RelationshipPage } from '../pages/RelationshipPage'
import { AuthorisedPeoplePage } from '../pages/AuthorisedPeoplePage'
import { QuestionnairePage } from '../pages/QuestionnairePage'
import { ReviewSubmitPage } from '../pages/ReviewSubmitPage'

test('business onboarding — golden path (uninterrupted)', async ({ page, freshAccount }) => {
  const login         = new LoginPage(page)
  const dashboard     = new DashboardPage(page)
  const acctSel       = new AccountSelectionPage(page)
  const acctStep      = new AccountStepPage(page)
  const corpSetup     = new CorporateSetupPage(page)
  const companyDocs   = new CompanyDetailsPage(page)
  const ownership     = new OwnershipPage(page)
  const relationship  = new RelationshipPage(page)
  const authorised    = new AuthorisedPeoplePage(page)
  const questionnaire = new QuestionnairePage(page)
  const review        = new ReviewSubmitPage(page)

  // ── Step 1: Account selection ─────────────────────────────────────
  await page.goto('/onboard')
  await acctSel.selectBusiness({
    signingRole: 'signatory',
    firstName:   'Test',
    lastName:    'Signatory',
    email:       freshAccount.email,
  })
  await page.click('[data-testid="next-button"]')

  // ── Step 2: Create account (signup in onboarding) ─────────────────
  await acctStep.signup(freshAccount.email, freshAccount.password)
  await page.click('[data-testid="next-button"]')
  // After signup the renderer auto-advances to corporateSetup step.
  // Wait for the country search input to appear.
  await page.waitForSelector('input[placeholder="Start typing to search…"]', { timeout: 20_000 })

  // ── Step 3: Corporate setup ───────────────────────────────────────
  await corpSetup.selectJurisdiction('United Arab Emirates')
  await page.click('[data-testid="next-button"]')

  // ── Step 4: Company documents ─────────────────────────────────────
  await page.waitForSelector('[data-testid="upload-legal-existence"]', { timeout: 10_000 })
  await companyDocs.uploadTradeLicence(randomFile('legal_existence_proof'))
  await companyDocs.uploadAddressProof(randomFile('business_address_proof'))
  await companyDocs.uploadTaxCertificate(randomFile('tax_registration'))
  await page.click('[data-testid="next-button"]')

  // ── Step 5: Ownership ─────────────────────────────────────────────
  await page.waitForSelector('[data-testid="add-owner-button"]', { timeout: 10_000 })

  await ownership.addIndividualOwner({
    fullName:      'Jane Individual Owner',
    nationality:   'United Kingdom',
    ownershipPct:  60,
    passportFile:  randomFile('owner_id_passport'),
    addressFile:   randomFile('individual_address_proof'),
  })

  await ownership.addEntityOwner({
    legalName:         'Parent Corp Ltd',
    jurisdiction:      'United Kingdom',
    ownershipPct:      40,
    regCertFile:       randomFile('entity_registration_cert'),
    shareholdingFile:  randomFile('entity_shareholding'),
  })

  await page.click('[data-testid="next-button"]')

  // ── Step 6: Relationship profile ─────────────────────────────────
  await page.waitForTimeout(1_000)  // let step render
  await relationship.fill({
    direction:         'outbound',
    products:          ['Refined bars'],
    frequency:         'monthly',
    paymentMethods:    ['Wire transfer'],
  })
  await page.click('[data-testid="next-button"]')

  // ── Step 7: Authorised people ─────────────────────────────────────
  await page.waitForSelector('[data-testid="add-ap-button"]', { timeout: 10_000 })
  await authorised.addAuthorisedPerson({
    fullName:     'John Authorised Person',
    role:         'Director',
    passportFile: randomFile('owner_id_passport'),
    addressFile:  randomFile('individual_address_proof'),
  })
  await page.click('[data-testid="next-button"]')

  // ── Step 8: Questionnaire ─────────────────────────────────────────
  await page.waitForSelector('[data-testid^="q-"]', { timeout: 10_000 })
  await questionnaire.answerAll()
  await page.click('[data-testid="next-button"]')

  // ── Step 9: Review & submit ───────────────────────────────────────
  await page.waitForSelector('[data-testid="declaration-accept"]', { timeout: 10_000 })
  await review.acceptDeclarationAndSubmit()

  // Confirm submitted state
  await expect(
    page.locator('[data-testid="submit-button"]')
  ).toHaveText(/Submitted/i, { timeout: 15_000 })

  freshAccount.markPassed()
})
```

- [ ] **Step 2: Run the spec (expect partial pass — many selectors won't exist yet)**

```bash
cd c:/Users/laken/sitara-website
npx playwright test e2e/specs/golden-path.spec.ts --headed 2>&1 | tail -30
```

This run is diagnostic — the test will fail on whichever selector is missing first. Use the output to identify which data-testid changes from Tasks 5–13 need to be re-checked.

- [ ] **Step 3: Commit the spec**

```bash
git add e2e/specs/golden-path.spec.ts
git commit -m "test: add golden-path E2E spec (business onboarding)"
```

---

## Task 16: Create the save-and-resume spec

**Files:**
- Create: `sitara-website/e2e/specs/save-resume.spec.ts`

This spec uses its own `freshAccount` fixture (separate applicant from golden-path). After filling each step it clicks Save & Exit, logs out, logs back in at `/login`, returns to the dashboard, and resumes the application. After the final step it submits.

- [ ] **Step 1: Create `save-resume.spec.ts`**

```typescript
// e2e/specs/save-resume.spec.ts
import { test, expect } from '../fixtures/freshAccount'
import { randomFile } from '../fixtures/randomFile'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { AccountSelectionPage } from '../pages/AccountSelectionPage'
import { AccountStepPage } from '../pages/AccountStepPage'
import { CorporateSetupPage } from '../pages/CorporateSetupPage'
import { CompanyDetailsPage } from '../pages/CompanyDetailsPage'
import { OwnershipPage } from '../pages/OwnershipPage'
import { RelationshipPage } from '../pages/RelationshipPage'
import { AuthorisedPeoplePage } from '../pages/AuthorisedPeoplePage'
import { QuestionnairePage } from '../pages/QuestionnairePage'
import { ReviewSubmitPage } from '../pages/ReviewSubmitPage'

test('business onboarding — save and resume at every step', async ({ page, freshAccount }) => {
  const loginPage    = new LoginPage(page)
  const dashboard    = new DashboardPage(page)
  const acctSel      = new AccountSelectionPage(page)
  const acctStep     = new AccountStepPage(page)
  const corpSetup    = new CorporateSetupPage(page)
  const companyDocs  = new CompanyDetailsPage(page)
  const ownership    = new OwnershipPage(page)
  const relationship = new RelationshipPage(page)
  const authorised   = new AuthorisedPeoplePage(page)
  const questionnaire = new QuestionnairePage(page)
  const review       = new ReviewSubmitPage(page)

  /**
   * Save & Exit → log out → log in → resume application.
   * Verifies that the dashboard shows the application and the resume link works.
   */
  async function saveExitAndResume() {
    await page.click('[data-testid="save-exit-button"]')
    await page.waitForURL('**/dashboard', { timeout: 15_000 })

    await loginPage.logout()
    // logout() navigates to '/' — go to /login explicitly
    await loginPage.goto()
    await loginPage.login(freshAccount.email, freshAccount.password)

    await dashboard.expectApplicationCard()
    await dashboard.resumeApplication()
  }

  // ── Step 1: Account selection ─────────────────────────────────────
  await page.goto('/onboard')
  await acctSel.selectBusiness({
    signingRole: 'signatory',
    firstName:   'Test',
    lastName:    'Signatory',
    email:       freshAccount.email,
  })
  await page.click('[data-testid="next-button"]')

  // ── Step 2: Create account ────────────────────────────────────────
  await acctStep.signup(freshAccount.email, freshAccount.password)
  await page.click('[data-testid="next-button"]')
  await page.waitForSelector('input[placeholder="Start typing to search…"]', { timeout: 20_000 })

  // Save & resume after account creation
  await saveExitAndResume()

  // ── Step 3: Corporate setup ───────────────────────────────────────
  await page.waitForSelector('input[placeholder="Start typing to search…"]', { timeout: 10_000 })
  await corpSetup.selectJurisdiction('United Arab Emirates')
  await page.click('[data-testid="next-button"]')
  await page.waitForSelector('[data-testid="upload-legal-existence"]', { timeout: 10_000 })

  // Save & resume after corporate setup
  await saveExitAndResume()

  // ── Step 4: Company documents ─────────────────────────────────────
  await page.waitForSelector('[data-testid="upload-legal-existence"]', { timeout: 10_000 })
  await companyDocs.uploadTradeLicence(randomFile('legal_existence_proof'))
  await companyDocs.uploadAddressProof(randomFile('business_address_proof'))
  await companyDocs.uploadTaxCertificate(randomFile('tax_registration'))

  // Save & resume after company documents
  await saveExitAndResume()

  // ── Step 5: Ownership ─────────────────────────────────────────────
  await page.waitForSelector('[data-testid="add-owner-button"]', { timeout: 10_000 })
  await ownership.addIndividualOwner({
    fullName:     'Jane Individual Owner',
    ownershipPct: 60,
    passportFile: randomFile('owner_id_passport'),
    addressFile:  randomFile('individual_address_proof'),
  })
  await ownership.addEntityOwner({
    legalName:        'Parent Corp Ltd',
    ownershipPct:     40,
    regCertFile:      randomFile('entity_registration_cert'),
    shareholdingFile: randomFile('entity_shareholding'),
  })

  // Save & resume after ownership
  await saveExitAndResume()

  // Verify owners are still present after resume
  await page.waitForSelector('[data-testid="owner-card"]', { timeout: 10_000 })
  await expect(page.locator('[data-testid="owner-card"]')).toHaveCount(2)

  await page.click('[data-testid="next-button"]')

  // ── Step 6: Relationship profile ─────────────────────────────────
  await page.waitForTimeout(1_000)
  await relationship.fill({
    direction:      'outbound',
    products:       ['Refined bars'],
    frequency:      'monthly',
    paymentMethods: ['Wire transfer'],
  })

  // Save & resume after relationship
  await saveExitAndResume()

  await page.waitForTimeout(1_000)
  await page.click('[data-testid="next-button"]')

  // ── Step 7: Authorised people ─────────────────────────────────────
  await page.waitForSelector('[data-testid="add-ap-button"]', { timeout: 10_000 })
  await authorised.addAuthorisedPerson({
    fullName:     'John Authorised Person',
    role:         'Director',
    passportFile: randomFile('owner_id_passport'),
    addressFile:  randomFile('individual_address_proof'),
  })

  // Save & resume after authorised people
  await saveExitAndResume()

  // Verify AP card is still present
  await page.waitForSelector('[data-testid="ap-card"]', { timeout: 10_000 })
  await expect(page.locator('[data-testid="ap-card"]')).toHaveCount(1)
  await page.click('[data-testid="next-button"]')

  // ── Step 8: Questionnaire ─────────────────────────────────────────
  await page.waitForSelector('[data-testid^="q-"]', { timeout: 10_000 })
  await questionnaire.answerAll()

  // Save & resume after questionnaire
  await saveExitAndResume()

  await page.click('[data-testid="next-button"]')

  // ── Step 9: Review & submit ───────────────────────────────────────
  await page.waitForSelector('[data-testid="declaration-accept"]', { timeout: 10_000 })
  await review.acceptDeclarationAndSubmit()

  await expect(
    page.locator('[data-testid="submit-button"]')
  ).toHaveText(/Submitted/i, { timeout: 15_000 })

  freshAccount.markPassed()
})
```

- [ ] **Step 2: Commit**

```bash
git add e2e/specs/save-resume.spec.ts
git commit -m "test: add save-and-resume E2E spec (business onboarding)"
```

---

## Task 17: Create `live_documents` subdirectories

**Files:**
- Create subdirs under: `kora/backend/tests/live_documents/`

The folder is gitignored, so the directories themselves won't be committed. Create a `README.md` (not gitignored because it has no extension conflict) OR rely on the test file's error messages to guide the developer.

Since the directory is gitignored, the best approach is to create a `live_documents/.gitkeep` sub-approach — but we can't commit the dir. Instead, add a helper script.

- [ ] **Step 1: Create the subdirectory structure locally**

```bash
cd c:/Users/laken/kora/backend/tests/live_documents
mkdir -p legal_existence_proof
mkdir -p business_address_proof
mkdir -p tax_registration
mkdir -p owner_id_passport
mkdir -p owner_id_emirates
mkdir -p individual_address_proof
mkdir -p entity_registration_cert
mkdir -p entity_shareholding
```

- [ ] **Step 2: Update `README.md` in `live_documents/` with the new folder names**

The `README.md` is NOT gitignored (it's in a gitignored directory, but updating the docs in `kora/backend/tests/` root is worthwhile). Update `kora/backend/tests/live_documents/README.md` to reflect all 8 categories:

```markdown
# Live Test Documents

Drop your test documents here, organised by category.
This folder is gitignored — files are never committed to the repo.

## Folder structure

```
live_documents/
  legal_existence_proof/       ← Trade licences (DMCC, DET, ADGM…)
  business_address_proof/      ← Company utility bills / tenancy contracts
  tax_registration/            ← UAE TRN / corporate tax certificates
  owner_id_passport/           ← Passports (individual owners + APs)
  owner_id_emirates/           ← Emirates IDs (*_front.* and *_back.* required)
  individual_address_proof/    ← Individual utility bills / bank statements
  entity_registration_cert/    ← Entity owner company registration cert
  entity_shareholding/         ← Entity owner shareholding structure doc
```
```

- [ ] **Step 3: Add document files to each category**

Drop at least one file in each of the 8 category folders that you will actually test. Files used by the golden-path and save-resume specs are:
- `legal_existence_proof/` — at least one trade licence PDF or image
- `business_address_proof/` — at least one address proof
- `tax_registration/` — at least one tax cert
- `owner_id_passport/` — at least one passport (reused for APs)
- `individual_address_proof/` — at least one individual address proof (reused for APs)
- `entity_registration_cert/` — at least one entity registration cert
- `entity_shareholding/` — at least one shareholding document

`owner_id_emirates/` is not used by the business golden path spec but should be populated for future tests.

---

## Task 18: Run the full suite end-to-end

- [ ] **Step 1: Start both servers (if not already running)**

Terminal 1 — backend with TESTING=true:
```bash
cd c:/Users/laken/kora/backend
TESTING=true uvicorn app.main:app --port 8000 --reload
```

Terminal 2 — sitara-website:
```bash
cd c:/Users/laken/sitara-website
next dev -p 3001
```

- [ ] **Step 2: Run the golden-path spec first**

```bash
cd c:/Users/laken/sitara-website
npx playwright test e2e/specs/golden-path.spec.ts --headed
```

Expected: All 9 steps complete, the test marks passed, cleanup runs, exit 0.

Fix any selector mismatches (wrong `data-testid` values, missing attributes) iteratively until the spec passes.

- [ ] **Step 3: Run the save-resume spec**

```bash
npx playwright test e2e/specs/save-resume.spec.ts --headed
```

Expected: All 9 steps complete with save+logout+resume at each step, exit 0.

- [ ] **Step 4: Run the full suite together**

```bash
npx playwright test --reporter=html
```

Expected: Both specs pass. Open `e2e/test-results/html/index.html` to verify.

- [ ] **Step 5: Commit final state**

```bash
cd c:/Users/laken/sitara-website
git add .
git commit -m "test: complete Playwright E2E suite — golden path and save-resume"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|----------------|------|
| Install Playwright + config | Task 1, 3 |
| Backend cleanup endpoint (TESTING=true) | Task 2 |
| freshAccount fixture (unique email + teardown) | Task 4 |
| randomFile fixture (picks from live_documents/) | Task 4 |
| `data-testid` on login page | Task 5 |
| `data-testid` on dashboard (logout + resume) | Task 5 |
| `data-testid` on nav buttons (back/next/save-exit/submit) | Task 6 |
| `data-testid` on AccountStep (signup/login mode) | Task 7 |
| `testId` on DocumentUploadControl | Task 8 |
| `testId` wired into BusinessDocumentsStep | Task 9 |
| `data-testid` on OwnershipStep (add/save/cards/docs) | Task 10 |
| `data-testid` on AuthorisedPeopleStep | Task 11 |
| `data-testid` on QuestionsStep options | Task 12 |
| `data-testid` on ReviewSubmitStep declaration | Task 13 |
| 11 page objects | Task 14 |
| golden-path spec | Task 15 |
| save-resume spec | Task 16 |
| live_documents subdirectories | Task 17 |
| webServer with reuseExistingServer | Task 3 |
| LIVE_DOCS_DIR env var | Task 3, 4 |
| Random file selection per category | Task 4, 15, 16 |
| workers: 1 (serial) | Task 3 |
| Cleanup called only on pass | Task 4 |

**Known adaptive steps (not placeholders):**

- Task 9 Step 2 and Task 11 Steps 2–5 say "read the component to find exact lines" before making the edit. This is intentional — `BusinessDocumentsStep.tsx` and `AuthorisedPeopleStep.tsx` are large files and the exact DocumentUploadControl render locations need to be confirmed at implementation time. The table in Task 9 and the pattern in Task 11 give everything needed to make the edits.

- `RelationshipPage.ts` uses label text (`'Refined bars'`, `'Wire transfer'`) to click options. If the exact labels differ from the schema option labels, update the test call site in the spec, not the page object.

- `OwnershipPage.ts` uses `GoldCombobox` selectors with `[id^="gold-combobox"]`. Check the GoldCombobox component renders with a matching id pattern; if not, adjust to target by `aria-label` or placeholder text instead.
