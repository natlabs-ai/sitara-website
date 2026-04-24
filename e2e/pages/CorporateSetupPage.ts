import { type Page } from '@playwright/test'

export interface CorporateSetupData {
  /** Country name as it appears in the dropdown, e.g. "United Arab Emirates" */
  incCountry: string
  /** 'activity' | 'services' */
  bizOrientation: 'activity' | 'services'
  /** Does the business ever take ownership of precious metals? */
  takesOwnership: boolean
  /** Does the business ever hold client assets or funds? */
  holdsClientAssets: boolean
  /** Does the business act as a broker/agent for clients? */
  actsAsIntermediary: boolean
  /** Only required when holdsClientAssets is true */
  settlementFacilitation?: boolean
}

export class CorporateSetupPage {
  constructor(private readonly page: Page) {}

  get nextButton() {
    return this.page.getByTestId('next-button')
  }

  get backButton() {
    return this.page.getByTestId('back-button')
  }

  get saveAndExitButton() {
    return this.page.getByTestId('save-exit-button')
  }

  async waitForStep() {
    await this.page.waitForSelector('[data-testid="next-button"]')
  }

  async clickNext() {
    await this.nextButton.click()
  }

  async clickBack() {
    await this.backButton.click()
  }

  async clickSaveAndExit() {
    await this.saveAndExitButton.click()
  }

  async fill(data: CorporateSetupData) {
    // Business orientation radio
    await this.page.locator(`input[name="biz_orientation"][value="${data.bizOrientation}"]`).click()

    // Country of Incorporation — SearchableCountrySelect (custom text input + dropdown)
    const countryInput = this.page.getByPlaceholder('Start typing to search…')
    await countryInput.click()
    await countryInput.fill(data.incCountry.slice(0, 5))
    await this.page.getByRole('listitem').filter({ hasText: data.incCountry }).first().click()

    // Deterministic Q1: takes ownership of metals
    const q1Buttons = this.page.locator('div').filter({ hasText: /Does the business ever take ownership of precious metals\?/ }).last()
    await q1Buttons.getByRole('button', { name: data.takesOwnership ? 'Yes' : 'No' }).click()

    // Deterministic Q2: holds client assets or funds
    const q2Buttons = this.page.locator('div').filter({ hasText: /Does the business ever hold client assets or client funds/ }).last()
    await q2Buttons.getByRole('button', { name: data.holdsClientAssets ? 'Yes' : 'No' }).click()

    // Settlement facilitation follow-up (only if Q2 = Yes)
    if (data.holdsClientAssets && data.settlementFacilitation !== undefined) {
      const sfButtons = this.page.locator('div').filter({ hasText: /do you facilitate settlement/ }).last()
      await sfButtons.getByRole('button', { name: data.settlementFacilitation ? 'Yes' : 'No' }).click()
    }

    // Deterministic Q3: acts as intermediary
    const q3Buttons = this.page.locator('div').filter({ hasText: /Does the business ever arrange or execute precious-metal transactions for clients/ }).last()
    await q3Buttons.getByRole('button', { name: data.actsAsIntermediary ? 'Yes' : 'No' }).click()
  }
}
