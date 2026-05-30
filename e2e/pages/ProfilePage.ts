import { type Page } from '@playwright/test'

export class ProfilePage {
  constructor(private readonly page: Page) {}

  get nextButton() {
    return this.page.getByTestId('next-button')
  }

  async waitForStep() {
    await this.page.waitForSelector('#occupation')
  }

  async fill({
    occupation,
    sourceOfIncome,
    services,
  }: {
    occupation: string
    /** One or more INCOME_OPTIONS values: 'salary'|'business_profits'|'rental'|'investments'|'pension'|'inheritance'|'other'.
     *  Pass a comma-separated string or an array. Legacy free-text strings are mapped to 'other'. */
    sourceOfIncome: string | string[]
    services: string[]
  }) {
    await this.page.locator('#occupation').fill(occupation)

    // Normalise to array of option values
    const options = Array.isArray(sourceOfIncome)
      ? sourceOfIncome
      : ['salary', 'business_profits', 'rental', 'investments', 'pension', 'inheritance', 'other'].includes(sourceOfIncome)
      ? [sourceOfIncome]
      : ['other']  // legacy free-text → 'other'

    for (const value of options) {
      await this.page.locator(`#sourceOfIncome input[type="checkbox"]`).nth(
        ['salary', 'business_profits', 'rental', 'investments', 'pension', 'inheritance', 'other'].indexOf(value)
      ).check()
    }

    // If 'other' is selected, fill in the detail box with the original string (when it was free text)
    if (options.includes('other') && typeof sourceOfIncome === 'string' &&
        !['salary', 'business_profits', 'rental', 'investments', 'pension', 'inheritance', 'other'].includes(sourceOfIncome)) {
      await this.page.locator('#sourceOfIncomeOther').fill(sourceOfIncome)
    }

    for (const label of services) {
      await this.page.getByRole('button', { name: label }).click()
    }
  }

  async clickNext() {
    await this.nextButton.click()
  }
}
