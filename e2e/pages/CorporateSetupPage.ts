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

    // Country of Incorporation — GoldCombobox (custom text input + ul/button dropdown)
    const countryInput = this.page.getByPlaceholder('Start typing to search…')
    await countryInput.click()
    await countryInput.fill(data.incCountry.slice(0, 5))
    // GoldCombobox renders dropdown items as <button type="button"> inside a <ul>
    await this.page.locator('ul button').filter({ hasText: data.incCountry }).first().click()

    // Deterministic Q1: takes ownership of metals
    // .filter({ has: button }) excludes the inner text-only div and gives us the block container
    const q1Block = this.page.locator('div')
      .filter({ hasText: /Does the business ever take ownership of precious metals/ })
      .filter({ has: this.page.locator('button[type="button"]') })
      .last()
    await q1Block.getByRole('button', { name: data.takesOwnership ? 'Yes' : 'No' }).click()

    // Deterministic Q2: holds client assets or funds
    const q2Block = this.page.locator('div')
      .filter({ hasText: /Does the business ever hold client assets or client funds/ })
      .filter({ has: this.page.locator('button[type="button"]') })
      .last()
    await q2Block.getByRole('button', { name: data.holdsClientAssets ? 'Yes' : 'No' }).click()

    // Settlement facilitation follow-up (only if Q2 = Yes)
    if (data.holdsClientAssets && data.settlementFacilitation !== undefined) {
      const sfBlock = this.page.locator('div')
        .filter({ hasText: /do you facilitate settlement/i })
        .filter({ has: this.page.locator('button[type="button"]') })
        .last()
      await sfBlock.getByRole('button', { name: data.settlementFacilitation ? 'Yes' : 'No' }).click()
    }

    // Deterministic Q3: acts as intermediary
    const q3Block = this.page.locator('div')
      .filter({ hasText: /Does the business ever arrange or execute precious-metal transactions for clients/ })
      .filter({ has: this.page.locator('button[type="button"]') })
      .last()
    await q3Block.getByRole('button', { name: data.actsAsIntermediary ? 'Yes' : 'No' }).click()
  }
}
