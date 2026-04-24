// e2e/specs/golden-path.spec.ts
import { test } from '../fixtures/freshAccount'
import { expect } from '@playwright/test'
import { randomFile } from '../fixtures/randomFile'
import {
  AccountSelectionPage,
  AccountStepPage,
  CorporateSetupPage,
  CompanyDetailsPage,
  OwnershipPage,
  RelationshipPage,
  AuthorisedPeoplePage,
  QuestionnairePage,
  ReviewSubmitPage,
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
  firstName: 'Golden',
  lastName: 'PathOwner',
  nationality: 'United Arab Emirates',
  dob: '1980-06-15',
  ownershipPct: 100,
}

const AP = {
  firstName: 'Golden',
  lastName: 'PathAP',
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

test.describe('Business onboarding — golden path', () => {
  test('completes the full business onboarding flow end-to-end', async ({ page, freshAccount }) => {
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
    // signUp() does NOT advance; caller clicks next
    await accountStep.clickNext()
    // Wait for corporateSetup sentinel
    await page.waitForSelector('[data-testid="next-button"]')

    // -------------------------------------------------------------------------
    // 4. corporateSetup
    // -------------------------------------------------------------------------
    const corporateSetup = new CorporateSetupPage(page)
    await corporateSetup.fill(CORP_SETUP)
    await corporateSetup.clickNext()
    // takesOwnership = true → advanced flow; companyDetails step follows
    await page.waitForSelector('[data-testid="upload-legal-existence-input"]')

    // -------------------------------------------------------------------------
    // 5. companyDetails — upload business documents
    //    (advanced flow only; requires takesOwnership = true)
    // -------------------------------------------------------------------------
    const companyDetails = new CompanyDetailsPage(page)
    await companyDetails.uploadDocuments({
      legalExistence: randomFile('legal_existence_proof'),
      constitutional: randomFile('legal_existence_proof'), // reuse same category — no dedicated constitutional category
      registeredAddress: randomFile('business_address_proof'),
      taxRegistration: randomFile('legal_existence_proof'), // tax_registration dir empty — reuse legal doc
    })
    await companyDetails.clickNext()
    await page.waitForSelector('[data-testid="add-owner-button"]')

    // -------------------------------------------------------------------------
    // 6. ownership — add one individual UBO at 100 %
    // -------------------------------------------------------------------------
    const ownershipPage = new OwnershipPage(page)
    await ownershipPage.addIndividualOwner({
      ...OWNER,
      idFile: randomFile('owner_id'),
      addressFile: randomFile('business_address_proof'),
    })
    // Wait for the owner card to appear before advancing
    await page.waitForSelector('[data-testid="owner-card"]')
    await ownershipPage.clickNext()
    // relationship step follows in advanced flow
    await page.waitForSelector('[data-testid="next-button"]')

    // -------------------------------------------------------------------------
    // 7. relationship — describe the business relationship
    //    (advanced flow only; requires takesOwnership = true)
    // -------------------------------------------------------------------------
    const relationshipPage = new RelationshipPage(page)
    await relationshipPage.fill(RELATIONSHIP)
    await relationshipPage.clickNext()
    await page.waitForSelector('[data-testid="add-ap-button"]')

    // -------------------------------------------------------------------------
    // 8. authorisedPeople — add one authorised person
    // -------------------------------------------------------------------------
    const authorisedPeople = new AuthorisedPeoplePage(page)
    await authorisedPeople.addPerson({
      ...AP,
      idFile: randomFile('owner_id'),
      addressFile: randomFile('business_address_proof'),
    })
    // Wait for the AP card to appear before advancing
    await page.waitForSelector('[data-testid="ap-card"]')
    await authorisedPeople.clickNext()
    await page.waitForSelector('[data-testid="next-button"]')

    // -------------------------------------------------------------------------
    // 9. questionnaire — answer all questions on the compliant path
    // -------------------------------------------------------------------------
    const questionnaire = new QuestionnairePage(page)

    await questionnaire.answerRadio('pep_exposure', 'no')
    await questionnaire.answerRadio('sanctions_screening', 'yes')
    await questionnaire.answerRadio('ubo_disclosed_verified', 'yes')
    await questionnaire.answerRadio('aml_policy', 'yes')
    await questionnaire.answerRadio('expected_txn_volume_usd_band', '>10m')

    // countries_of_operation_iso2 is a country_multi_select with no testid.
    // Best-effort: try to select UAE; if the control is absent / optional, continue.
    try {
      const countrySelect = page.getByLabel('Select countries')
      if (await countrySelect.isVisible({ timeout: 2_000 })) {
        await countrySelect.fill('United Arab Emirates')
        await page.getByRole('listitem').filter({ hasText: 'United Arab Emirates' }).first().click()
      }
    } catch {
      // Not required; skip silently
    }

    await questionnaire.answerRadio('kyc_sops', 'yes')
    await questionnaire.ackQuestion('consent_screening')
    await questionnaire.ackQuestion('ack_ongoing_review')

    await questionnaire.clickNext()
    // Wait for the review/submit step
    await page.waitForSelector('[data-testid="submit-button"]')

    // -------------------------------------------------------------------------
    // 10. review & submit
    // -------------------------------------------------------------------------
    const reviewSubmit = new ReviewSubmitPage(page)
    await reviewSubmit.waitForReady()
    await reviewSubmit.submit()

    // -------------------------------------------------------------------------
    // 11. Assert success
    // -------------------------------------------------------------------------
    await expect(
      page.getByText(/your application has been submitted/i),
    ).toBeVisible({ timeout: 30_000 })

    // Signal that the test passed so teardown can clean up
    freshAccount.markPassed()
  })
})
