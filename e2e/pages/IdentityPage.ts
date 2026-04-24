import { type Page } from '@playwright/test'

/**
 * IdentityPage covers the `identity` wizard step.
 * In DEV_MODE, only countryOfResidence is required to enable Next.
 * handleNext() auto-advances for non-UAE accounts (no Emirates ID needed).
 */
export class IdentityPage {
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
    // The GoldCombobox for country of residence has this placeholder
    await this.page.waitForSelector('[placeholder="Start typing to search…"]')
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

  /**
   * Sets country of residence and advances.
   * Uses a non-UAE country so handleNext() auto-advances without Emirates ID.
   * @param country - Country name, default "Bahrain" (non-UAE, avoids EID requirement)
   */
  async fill(country = 'Bahrain') {
    const input = this.page.getByPlaceholder('Start typing to search…').first()
    await input.click()
    await input.fill(country.slice(0, 4))
    await this.page.getByRole('option', { name: country }).first().click()
  }
}
