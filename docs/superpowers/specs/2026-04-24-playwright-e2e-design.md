# Playwright E2E Test Suite Design
# sitara-website — Business Onboarding Golden Path

**Date:** 2026-04-24
**Scope:** sitara-website (port 3001) end-to-end onboarding tests

---

## Goal

Two E2E tests cover the complete business onboarding flow: one uninterrupted golden path and one save-and-resume test that logs out and back in after every step, verifying data persistence throughout.

---

## Architecture

```
sitara-website/
  e2e/
    playwright.config.ts          ← webServer + project config
    .env.test                     ← LIVE_DOCS_DIR, BASE_URL, BACKEND_URL
    fixtures/
      account.ts                  ← fresh applicant via API + teardown on pass
      randomFile.ts               ← picks a random file from a live_documents/ category
    pages/
      LoginPage.ts
      DashboardPage.ts
      AccountSelectionPage.ts
      CorporateSetupPage.ts
      CompanyDetailsPage.ts
      RelationshipPage.ts
      OwnershipPage.ts
      AuthorisedPeoplePage.ts
      QuestionnairePage.ts
      ReviewSubmitPage.ts
    specs/
      golden-path.spec.ts         ← full flow, no interruption
      save-resume.spec.ts         ← save → logout → login → resume at every step
```

---

## Environment Variables

`e2e/.env.test` (gitignored):

```
BASE_URL=http://localhost:3001
BACKEND_URL=http://localhost:8000
LIVE_DOCS_DIR=../kora/backend/tests/live_documents
TEST_TENANT_SLUG=test-tenant           # slug for the test tenant (must exist in DB)
```

`LIVE_DOCS_DIR` is a relative path from the sitara-website root, pointing to the existing `kora/backend/tests/live_documents/` folder. This avoids duplicating documents across repos.

---

## playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 120_000,
  retries: 0,
  workers: 1,                   // serial — both specs share the same test account
  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'cd ../kora/backend && uvicorn app.main:app --port 8000',
      url: 'http://localhost:8000/health',
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -- --port 3001',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
    },
  ],
})
```

---

## Fixtures

### `fixtures/account.ts`

Creates a fresh applicant + application via the backend API before the test suite runs. Credentials are exposed to specs via fixture. Teardown (cleanup) is conditional — it runs only if every spec in the session passed (both golden-path and save-resume), ensuring failed-run data stays available for debugging.

```typescript
import { test as base } from '@playwright/test'
import axios from 'axios'

export type AccountFixture = {
  email: string
  password: string
  applicationId: string
  markPassed: () => void
}

export const test = base.extend<{ account: AccountFixture }>({
  account: async ({}, use) => {
    const backend = process.env.BACKEND_URL
    const slug = process.env.TEST_TENANT_SLUG

    // Create applicant via API
    const { data } = await axios.post(`${backend}/api/v1/test/create-applicant`, {
      tenant_slug: slug,
    })

    let passed = false

    await use({
      email: data.email,
      password: data.password,
      applicationId: data.application_id,
      markPassed: () => { passed = true },
    })

    if (passed) {
      await axios.delete(`${backend}/api/v1/test/cleanup`, {
        data: { application_id: data.application_id },
      })
    }
  },
})
```

### `fixtures/randomFile.ts`

Picks a random file from a document category folder under `LIVE_DOCS_DIR`. Emirates ID is a special case — it requires both a `*_front.*` and `*_back.*` file.

```typescript
import fs from 'fs'
import path from 'path'

const LIVE_DOCS = path.resolve(process.env.LIVE_DOCS_DIR ?? '../kora/backend/tests/live_documents')

export function randomFile(category: string): string {
  const dir = path.join(LIVE_DOCS, category)
  const files = fs.readdirSync(dir).filter(f => /\.(pdf|jpg|jpeg|png|tiff)$/i.test(f))
  if (files.length === 0) throw new Error(`No documents found in ${dir}`)
  return path.join(dir, files[Math.floor(Math.random() * files.length)])
}

export function emiratesIdFiles(): { front: string; back: string } {
  const dir = path.join(LIVE_DOCS, 'owner_id_emirates')
  const all = fs.readdirSync(dir)
  const front = all.find(f => /_front\./i.test(f))
  const back  = all.find(f => /_back\./i.test(f))
  if (!front || !back) throw new Error('Emirates ID requires *_front.* and *_back.* files in owner_id_emirates/')
  return { front: path.join(dir, front), back: path.join(dir, back) }
}
```

---

## Page Objects

Each page object encapsulates selectors and actions for one onboarding step. Methods are intentionally small — one action per method — so specs read like plain English.

### `pages/LoginPage.ts`

```typescript
export class LoginPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/login') }
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email)
    await this.page.fill('[data-testid="password"]', password)
    await this.page.click('[data-testid="login-submit"]')
    await this.page.waitForURL('**/dashboard')
  }
  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout"]')
    await this.page.waitForURL('**/login')
  }
}
```

### `pages/DashboardPage.ts`

```typescript
export class DashboardPage {
  constructor(private page: Page) {}

  async resumeApplication() {
    await this.page.click('[data-testid="resume-application"]')
    await this.page.waitForURL('**/onboard/**')
  }
  async expectApplicationVisible() {
    await expect(this.page.locator('[data-testid="application-card"]')).toBeVisible()
  }
}
```

### `pages/AccountSelectionPage.ts`

```typescript
export class AccountSelectionPage {
  constructor(private page: Page) {}

  async selectBusiness() {
    await this.page.click('[data-testid="account-type-business"]')
    await this.page.click('[data-testid="next"]')
  }
}
```

### `pages/CorporateSetupPage.ts`

Sets jurisdiction (UAE) and answers the three yes/no questions (PEP, sanctions, criminal).

```typescript
export class CorporateSetupPage {
  constructor(private page: Page) {}

  async fill(answers: { pep: boolean; sanctions: boolean; criminal: boolean }) {
    await this.page.selectOption('[data-testid="jurisdiction"]', 'AE')
    await this._answer('pep', answers.pep)
    await this._answer('sanctions', answers.sanctions)
    await this._answer('criminal', answers.criminal)
    await this.page.click('[data-testid="next"]')
  }

  private async _answer(field: string, yes: boolean) {
    const value = yes ? 'yes' : 'no'
    await this.page.click(`[data-testid="${field}-${value}"]`)
  }
}
```

### `pages/CompanyDetailsPage.ts`

Uploads trade licence, proof of address, and tax registration certificate.

```typescript
export class CompanyDetailsPage {
  constructor(private page: Page) {}

  async fillAndUpload(files: {
    tradeLicence: string
    proofOfAddress: string
    taxCertificate: string
  }) {
    await this.page.fill('[data-testid="company-name"]', 'Test Corp LLC')
    await this.page.fill('[data-testid="registration-number"]', 'TEST-REG-001')
    await this._upload('trade-licence-upload', files.tradeLicence)
    await this._upload('proof-of-address-upload', files.proofOfAddress)
    await this._upload('tax-certificate-upload', files.taxCertificate)
    await this.page.click('[data-testid="next"]')
  }

  private async _upload(testId: string, filePath: string) {
    const input = this.page.locator(`[data-testid="${testId}"] input[type="file"]`)
    await input.setInputFiles(filePath)
    await this.page.waitForSelector(`[data-testid="${testId}-success"]`)
  }
}
```

### `pages/RelationshipPage.ts`

Direction of trade, products/services, transaction frequency, expected value, payment methods.

```typescript
export class RelationshipPage {
  constructor(private page: Page) {}

  async fill() {
    await this.page.click('[data-testid="trade-direction-both"]')
    await this.page.fill('[data-testid="products-services"]', 'Software development services')
    await this.page.click('[data-testid="frequency-monthly"]')
    await this.page.fill('[data-testid="expected-value"]', '50000')
    await this.page.click('[data-testid="payment-wire"]')
    await this.page.click('[data-testid="next"]')
  }
}
```

### `pages/OwnershipPage.ts`

Adds two beneficial owners: one individual (with passport + proof of address) and one entity (with registration certificate + shareholding document).

```typescript
export class OwnershipPage {
  constructor(private page: Page) {}

  async addIndividualOwner(files: { passport: string; proofOfAddress: string }) {
    await this.page.click('[data-testid="add-owner"]')
    await this.page.click('[data-testid="owner-type-individual"]')
    await this.page.fill('[data-testid="owner-full-name"]', 'Jane Individual Owner')
    await this.page.fill('[data-testid="owner-nationality"]', 'GB')
    await this.page.fill('[data-testid="owner-ownership-pct"]', '60')
    await this._upload('owner-passport-upload', files.passport)
    await this._upload('owner-address-upload', files.proofOfAddress)
    await this.page.click('[data-testid="save-owner"]')
    await this.page.waitForSelector('[data-testid="owner-card-Jane Individual Owner"]')
  }

  async addEntityOwner(files: { registrationCert: string; shareholding: string }) {
    await this.page.click('[data-testid="add-owner"]')
    await this.page.click('[data-testid="owner-type-entity"]')
    await this.page.fill('[data-testid="owner-entity-name"]', 'Parent Corp Ltd')
    await this.page.fill('[data-testid="owner-entity-jurisdiction"]', 'GB')
    await this.page.fill('[data-testid="owner-ownership-pct"]', '40')
    await this._upload('owner-reg-cert-upload', files.registrationCert)
    await this._upload('owner-shareholding-upload', files.shareholding)
    await this.page.click('[data-testid="save-owner"]')
    await this.page.waitForSelector('[data-testid="owner-card-Parent Corp Ltd"]')
  }

  async proceed() {
    await this.page.click('[data-testid="next"]')
  }

  private async _upload(testId: string, filePath: string) {
    const input = this.page.locator(`[data-testid="${testId}"] input[type="file"]`)
    await input.setInputFiles(filePath)
    await this.page.waitForSelector(`[data-testid="${testId}-success"]`)
  }
}
```

### `pages/AuthorisedPeoplePage.ts`

Adds one authorised person with passport and proof of address.

```typescript
export class AuthorisedPeoplePage {
  constructor(private page: Page) {}

  async addAuthorisedPerson(files: { passport: string; proofOfAddress: string }) {
    await this.page.click('[data-testid="add-authorised-person"]')
    await this.page.fill('[data-testid="ap-full-name"]', 'John Authorised Person')
    await this.page.fill('[data-testid="ap-role"]', 'Director')
    await this._upload('ap-passport-upload', files.passport)
    await this._upload('ap-address-upload', files.proofOfAddress)
    await this.page.click('[data-testid="save-ap"]')
    await this.page.waitForSelector('[data-testid="ap-card-John Authorised Person"]')
    await this.page.click('[data-testid="next"]')
  }

  private async _upload(testId: string, filePath: string) {
    const input = this.page.locator(`[data-testid="${testId}"] input[type="file"]`)
    await input.setInputFiles(filePath)
    await this.page.waitForSelector(`[data-testid="${testId}-success"]`)
  }
}
```

### `pages/QuestionnairePage.ts`

Answers the compliance questionnaire questions.

```typescript
export class QuestionnairePage {
  constructor(private page: Page) {}

  async answerAll() {
    // Answer all yes/no questions with the default safe answers
    const questions = await this.page.locator('[data-testid^="question-"]').all()
    for (const q of questions) {
      const noBtn = q.locator('[data-testid="answer-no"]')
      if (await noBtn.isVisible()) await noBtn.click()
    }
    await this.page.click('[data-testid="next"]')
  }
}
```

### `pages/ReviewSubmitPage.ts`

Verifies the review page shows data and submits.

```typescript
export class ReviewSubmitPage {
  constructor(private page: Page) {}

  async expectCompanyName(name: string) {
    await expect(this.page.locator('[data-testid="review-company-name"]')).toContainText(name)
  }
  async expectOwnerCount(n: number) {
    await expect(this.page.locator('[data-testid="review-owner-card"]')).toHaveCount(n)
  }
  async expectAuthorisedPersonCount(n: number) {
    await expect(this.page.locator('[data-testid="review-ap-card"]')).toHaveCount(n)
  }
  async submit() {
    await this.page.click('[data-testid="submit-application"]')
    await this.page.waitForSelector('[data-testid="submission-success"]')
  }
}
```

---

## Document Categories Used

The tests draw files from these subdirectories of `LIVE_DOCS_DIR`:

| Step | Category folder | Description |
|------|----------------|-------------|
| Company details | `legal_existence_proof/` | Trade licence |
| Company details | `business_address_proof/` | Company proof of address |
| Company details | `tax_registration/` | Tax certificate |
| Individual owner | `owner_id_passport/` | Passport |
| Individual owner | `individual_address_proof/` | Individual proof of address |
| Entity owner | `entity_registration_cert/` | Company registration certificate |
| Entity owner | `entity_shareholding/` | Shareholding structure document |
| Authorised person | `owner_id_passport/` | Passport (shared category) |
| Authorised person | `individual_address_proof/` | Proof of address (shared category) |

---

## Spec: `specs/golden-path.spec.ts`

Full flow with no interruption. Single `test` block wrapping all steps sequentially.

```typescript
import { test } from '../fixtures/account'
import { randomFile } from '../fixtures/randomFile'
import { LoginPage } from '../pages/LoginPage'
import { AccountSelectionPage } from '../pages/AccountSelectionPage'
import { CorporateSetupPage } from '../pages/CorporateSetupPage'
import { CompanyDetailsPage } from '../pages/CompanyDetailsPage'
import { RelationshipPage } from '../pages/RelationshipPage'
import { OwnershipPage } from '../pages/OwnershipPage'
import { AuthorisedPeoplePage } from '../pages/AuthorisedPeoplePage'
import { QuestionnairePage } from '../pages/QuestionnairePage'
import { ReviewSubmitPage } from '../pages/ReviewSubmitPage'

test('business onboarding — golden path (uninterrupted)', async ({ page, account }) => {
  const login          = new LoginPage(page)
  const accountSel     = new AccountSelectionPage(page)
  const corporateSetup = new CorporateSetupPage(page)
  const companyDetails = new CompanyDetailsPage(page)
  const relationship   = new RelationshipPage(page)
  const ownership      = new OwnershipPage(page)
  const authorised     = new AuthorisedPeoplePage(page)
  const questionnaire  = new QuestionnairePage(page)
  const review         = new ReviewSubmitPage(page)

  await login.goto()
  await login.login(account.email, account.password)

  await accountSel.selectBusiness()
  await corporateSetup.fill({ pep: false, sanctions: false, criminal: false })

  await companyDetails.fillAndUpload({
    tradeLicence:    randomFile('legal_existence_proof'),
    proofOfAddress:  randomFile('business_address_proof'),
    taxCertificate:  randomFile('tax_registration'),
  })

  await relationship.fill()

  await ownership.addIndividualOwner({
    passport:       randomFile('owner_id_passport'),
    proofOfAddress: randomFile('individual_address_proof'),
  })
  await ownership.addEntityOwner({
    registrationCert: randomFile('entity_registration_cert'),
    shareholding:     randomFile('entity_shareholding'),
  })
  await ownership.proceed()

  await authorised.addAuthorisedPerson({
    passport:       randomFile('owner_id_passport'),
    proofOfAddress: randomFile('individual_address_proof'),
  })

  await questionnaire.answerAll()

  await review.expectCompanyName('Test Corp LLC')
  await review.expectOwnerCount(2)
  await review.expectAuthorisedPersonCount(1)
  await review.submit()

  account.markPassed()
})
```

---

## Spec: `specs/save-resume.spec.ts`

After each step: save & close → logout → login → dashboard → resume → assert previous data visible → continue. Uses the same shared `account` fixture. Because `workers: 1`, this runs after golden-path and shares the applicant credentials but uses a fresh browser context.

```typescript
test('business onboarding — save and resume at every step', async ({ page, account }) => {
  // Helper: save → logout → login → resume
  async function saveAndResume() {
    await page.click('[data-testid="save-and-close"]')
    await page.waitForURL('**/dashboard')
    await login.logout()
    await login.goto()
    await login.login(account.email, account.password)
    await dashboard.expectApplicationVisible()
    await dashboard.resumeApplication()
  }

  // ... (step-by-step fill + saveAndResume after each)

  account.markPassed()
})
```

Each step fills out its form and then calls `saveAndResume()`, then the next step verifies the previously-entered data is still visible before filling in additional data.

---

## Backend Cleanup Endpoint

A test-only endpoint `DELETE /api/v1/test/cleanup` is added to the FastAPI backend. It is only registered when the environment variable `TESTING=true`.

**What it deletes:**
1. All Azure Blob Storage files associated with the application's documents
2. All DB rows in reverse FK order: documents → authorized_persons → beneficial_owners → applications → applicants

**Trigger:** Called from the `account` fixture teardown only when `markPassed()` has been called (i.e., both specs passed).

**Security:** The endpoint checks `os.environ.get("TESTING") == "true"` and returns 403 otherwise. It is never reachable in production.

---

## live_documents/ Folder Structure (Required)

The following subdirectories must exist under `kora/backend/tests/live_documents/`:

```
live_documents/
  legal_existence_proof/        ← Trade licences (DMCC, DET, ADGM…)
  business_address_proof/       ← Company utility bills / tenancy contracts
  tax_registration/             ← UAE TRN / corporate tax certificates
  owner_id_passport/            ← Passports (shared: individual owners + APs)
  owner_id_emirates/            ← Emirates IDs (*_front.* and *_back.* required)
  individual_address_proof/     ← Individual utility bills / bank statements
  entity_registration_cert/     ← Entity owner company registration
  entity_shareholding/          ← Entity owner shareholding structure
```

---

## Test Data Strategy

- **Company name:** `Test Corp LLC` (hardcoded — predictable for assertions)
- **Files:** random pick per category on every run — validates the pipeline handles real variation
- **Credentials:** generated per run by backend `POST /api/v1/test/create-applicant`
- **Cleanup:** only after both specs pass — failed runs leave data intact for debugging

---

## What Is Not In Scope

- Individual onboarding flow (separate spec, separate plan)
- Mobile viewports
- Accessibility checks
- Performance assertions
- Non-UAE jurisdictions
- Negative paths (invalid documents, failed uploads)

These are separate future specs and should not be mixed into this plan.

---

## Success Criteria

1. `npx playwright test` runs both specs and exits 0
2. Golden path completes without pausing: all 9 steps, 3 documents for company + 4 for ownership + 2 for authorised person = 9 total uploads
3. Save-resume test verifies data survives logout at every step
4. On full pass: test applicant, all documents (Blob + DB rows) are deleted
5. On partial failure: no cleanup runs, data is inspectable in the DB and Azure portal
