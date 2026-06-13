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
    // Business orientation — SelectableCard with testId orientation-activity | orientation-services
    await this.page.getByTestId(`orientation-${data.bizOrientation}`).click()

    // Country of Incorporation — GoldCombobox (custom text input + ul/button dropdown)
    const countryInput = this.page.getByPlaceholder('Start typing to search…')
    await countryInput.click()
    await countryInput.fill(data.incCountry.slice(0, 5))
    // GoldCombobox renders dropdown items as <button type="button"> inside a <ul>
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
}
