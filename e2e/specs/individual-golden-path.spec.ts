// e2e/specs/individual-golden-path.spec.ts
import { test } from '../fixtures/freshAccount'
import { expect } from '@playwright/test'
import {
  AccountSelectionPage,
  AccountStepPage,
  IdentityPage,
  ProfilePage,
  RiskDeclarationsPage,
  ReviewSubmitPage,
} from '../pages'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const PROFILE = {
  occupation: 'Software Engineer',
  sourceOfIncome: 'Salary from full-time employment',
  services: ['Buy gold'],
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Individual onboarding — golden path', () => {
  test('completes the full individual onboarding flow end-to-end', async ({ page, freshAccount }) => {
    // -------------------------------------------------------------------------
    // 1. Navigate to the onboarding wizard
    // -------------------------------------------------------------------------
    await page.goto('/onboard')
    await page.waitForSelector('[data-testid="next-button"]')

    // -------------------------------------------------------------------------
    // 2. accountSelection — select Personal
    // -------------------------------------------------------------------------
    const accountSelection = new AccountSelectionPage(page)
    await accountSelection.selectIndividual()
    await page.waitForSelector('[data-testid="account-email"]')

    // -------------------------------------------------------------------------
    // 3. login (sign-up path)
    // -------------------------------------------------------------------------
    const accountStep = new AccountStepPage(page)
    await accountStep.signUp(freshAccount.email, freshAccount.password)
    await accountStep.clickNext()

    // -------------------------------------------------------------------------
    // 4. identity — country of residence only (DEV_MODE bypasses document upload)
    // -------------------------------------------------------------------------
    const identity = new IdentityPage(page)
    await identity.waitForStep()
    await identity.fill('Bahrain')
    await identity.clickNext()

    // -------------------------------------------------------------------------
    // 5. profile — occupation, source of income, service category
    // -------------------------------------------------------------------------
    const profile = new ProfilePage(page)
    await profile.waitForStep()
    await profile.fill(PROFILE)
    await profile.clickNext()

    // -------------------------------------------------------------------------
    // 6. riskDeclarations — no PEP, no sanctions, no third-party use
    // -------------------------------------------------------------------------
    const riskDeclarations = new RiskDeclarationsPage(page)
    await riskDeclarations.waitForStep()
    await riskDeclarations.answerNo('pep')
    await riskDeclarations.answerNo('sanctions')
    await riskDeclarations.answerNo('thirdParty')

    await riskDeclarations.clickNext()

    // -------------------------------------------------------------------------
    // 7. review & submit
    // -------------------------------------------------------------------------
    await page.waitForSelector('[data-testid="submit-button"]')
    const reviewSubmit = new ReviewSubmitPage(page)
    await reviewSubmit.waitForReady()

    // Wait for the submit API call to complete before asserting success text
    const submitDone = page.waitForResponse(
      res => res.url().includes('/submit') && res.request().method() === 'POST',
      { timeout: 20_000 }
    )
    await reviewSubmit.submit()
    await submitDone

    // -------------------------------------------------------------------------
    // 8. Assert success
    // -------------------------------------------------------------------------
    await expect(
      page.getByText(/your application has been submitted/i),
    ).toBeVisible({ timeout: 30_000 })

    freshAccount.markPassed()
  })
})
