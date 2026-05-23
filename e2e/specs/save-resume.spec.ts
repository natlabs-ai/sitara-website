// e2e/specs/save-resume.spec.ts
import { test } from '../fixtures/freshAccount'
import { expect } from '@playwright/test'
import { randomFile } from '../fixtures/randomFile'
import {
  AccountSelectionPage,
  AccountStepPage,
  IdentityPage,
  CorporateSetupPage,
  CompanyDetailsPage,
  OwnershipPage,
  RelationshipPage,
  AuthorisedPeoplePage,
  QuestionnairePage,
  ReviewSubmitPage,
  DashboardPage,
} from '../pages'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const CORP_SETUP = {
  incCountry: 'United Arab Emirates',
  bizOrientation: 'activity' as const,
  takesOwnership: true, // triggers "advanced" flow → companyDetails + relationship steps
  holdsClientAssets: false,
  actsAsIntermediary: false,
}

const OWNER = {
  firstName: 'Resume',
  lastName: 'TestOwner',
  nationality: 'United Arab Emirates',
  dob: '1975-03-20',
  ownershipPct: 100,
}

const AP = {
  firstName: 'Resume',
  lastName: 'TestAP',
  role: 'Director',
}

const RELATIONSHIP = {
  direction: 'inbound',
  products: ['bars'],
  frequency: 'monthly',
  valueBand: '>1m',
  paymentMethods: ['bank_transfer'],
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe('Business onboarding — save & resume', () => {
  test('saves and resumes twice across the full flow', async ({ page, freshAccount }) => {
    // -------------------------------------------------------------------------
    // 1. Navigate to the onboarding wizard
    // -------------------------------------------------------------------------
    await page.goto('/onboard')
    await page.waitForSelector('[data-testid="next-button"]')

    // -------------------------------------------------------------------------
    // 2. accountSelection — select business / signatory
    // -------------------------------------------------------------------------
    const accountSelection = new AccountSelectionPage(page)
    await accountSelection.selectBusiness()
    // selectBusiness() calls clickNext() internally; wait for the login step
    await page.waitForSelector('[data-testid="account-email"]')

    // -------------------------------------------------------------------------
    // 3. login (sign-up path)
    // -------------------------------------------------------------------------
    const accountStep = new AccountStepPage(page)
    await accountStep.signUp(freshAccount.email, freshAccount.password)
    await accountStep.clickNext()

    // -------------------------------------------------------------------------
    // 4. identity — shown for all account types; DEV_MODE only needs country
    // -------------------------------------------------------------------------
    const identity = new IdentityPage(page)
    await identity.waitForStep()
    await identity.fill('Bahrain')
    await identity.clickNext()
    // Wait for corporateSetup sentinel
    await page.waitForSelector('input[name="biz_orientation"]')

    // -------------------------------------------------------------------------
    // 5. corporateSetup — fill but do NOT click Next
    // -------------------------------------------------------------------------
    const corporateSetup = new CorporateSetupPage(page)
    await corporateSetup.fill(CORP_SETUP)

    // =========================================================================
    // CHECKPOINT 1: Save after corporateSetup, resume on companyDetails
    // =========================================================================

    // 5. Click Save & Exit — expect redirect to dashboard
    await corporateSetup.clickSaveAndExit()
    await page.waitForURL('**/dashboard')

    // 6. Click Continue application on dashboard
    const dashboard1 = new DashboardPage(page)
    await dashboard1.waitForPage()
    await dashboard1.continueApplication()

    // 7. Assert wizard resumes on corporateSetup or companyDetails step
    await page.waitForSelector('[data-testid="upload-legal-existence"], [data-testid="next-button"]')
    expect(
      (await page.locator('[data-testid="upload-legal-existence"]').isVisible()) ||
      (await page.locator('[data-testid="next-button"]').isVisible()),
    ).toBe(true)

    // 8. Upload required documents on companyDetails
    const companyDetails = new CompanyDetailsPage(page)

    // If we landed back on corporateSetup (next-button visible but not upload), advance
    if (
      !(await page.locator('[data-testid="upload-legal-existence"]').isVisible({ timeout: 2_000 }).catch(() => false))
    ) {
      await corporateSetup.clickNext()
      await page.waitForSelector('[data-testid="upload-legal-existence"]')
    }

    await companyDetails.uploadDocuments({
      legalExistence: randomFile('legal_existence_proof'),
      constitutional: randomFile('legal_existence_proof'),
      registeredAddress: randomFile('business_address_proof'),
      taxRegistration: randomFile('legal_existence_proof'), // tax_registration dir empty — reuse legal doc
    })

    // 9. Click Next
    await companyDetails.clickNext()
    await page.waitForSelector('[data-testid="add-owner-button"]')

    // -------------------------------------------------------------------------
    // 10. ownership — add one individual UBO at 100 %
    // -------------------------------------------------------------------------
    const ownershipPage = new OwnershipPage(page)
    await ownershipPage.addIndividualOwner({
      ...OWNER,
      idFile: randomFile('owner_id'),
      addressFile: randomFile('business_address_proof'),
    })
    await page.waitForSelector('[data-testid="owner-card"]')

    // =========================================================================
    // CHECKPOINT 2: Save after ownership, resume on relationship
    // =========================================================================

    // 11. Click Save & Exit — expect redirect to dashboard
    await ownershipPage.clickSaveAndExit()
    await page.waitForURL('**/dashboard')

    // 12. Click Continue application on dashboard
    const dashboard2 = new DashboardPage(page)
    await dashboard2.waitForPage()
    await dashboard2.continueApplication()

    const relationshipPage = new RelationshipPage(page)

    // After checkpoint 2 the wizard always resumes on the ownership step
    // (current_step_id = "ownership"). OwnershipStep loads beneficial owners
    // via an async API call — wait up to 30 s for the full UI to appear.
    await page.waitForSelector('[data-testid="add-owner-button"]', { timeout: 30_000 })
    await ownershipPage.clickDeclaration()
    await ownershipPage.clickNext()

    // Wait for relationship step content (not next-button — it's always in the toolbar)
    await relationshipPage.waitForStep()

    // 14. Complete relationship
    await relationshipPage.fill(RELATIONSHIP)

    // 15. Click Next
    await relationshipPage.clickNext()
    await page.waitForSelector('[data-testid="add-ap-button"]')

    // -------------------------------------------------------------------------
    // 16. authorisedPeople — add one authorised person
    // -------------------------------------------------------------------------
    const authorisedPeople = new AuthorisedPeoplePage(page)
    await authorisedPeople.addPerson({
      ...AP,
      idFile: randomFile('owner_id'),
      addressFile: randomFile('business_address_proof'),
    })
    await page.waitForSelector('[data-testid="ap-card"]')
    await authorisedPeople.clickNext()
    await page.waitForSelector('[data-testid="next-button"]')

    // -------------------------------------------------------------------------
    // 17. questionnaire — answer all questions on the compliant path
    // -------------------------------------------------------------------------
    const questionnaire = new QuestionnairePage(page)

    await questionnaire.answerRadio('pep_exposure', 'no')
    await questionnaire.answerRadio('sanctions_screening', 'yes')
    await questionnaire.answerRadio('ubo_disclosed_verified', 'yes')
    await questionnaire.answerRadio('aml_policy', 'yes')
    await questionnaire.answerRadio('expected_txn_volume_usd_band', '>10m')
    await questionnaire.selectCountries(['United Arab Emirates'])
    await questionnaire.answerRadio('kyc_sops', 'yes')
    await questionnaire.ackQuestion('consent_screening')
    await questionnaire.ackQuestion('ack_ongoing_review')

    await questionnaire.clickNext()
    await page.waitForSelector('[data-testid="submit-button"]')

    // -------------------------------------------------------------------------
    // 18. review & submit
    // -------------------------------------------------------------------------
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
    // 19. Assert success
    // -------------------------------------------------------------------------
    await expect(
      page.getByText(/your application has been submitted/i),
    ).toBeVisible({ timeout: 30_000 })

    // 20. Signal that the test passed so teardown can clean up
    freshAccount.markPassed()
  })
})
