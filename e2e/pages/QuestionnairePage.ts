import { type Page } from '@playwright/test'

export class QuestionnairePage {
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

  /** Clicks the radio input for a questionnaire question. */
  async answerRadio(code: string, value: string) {
    await this.page.getByTestId(`q-${code}-${value}`).click()
  }

  /** Checks the acknowledgement checkbox for a questionnaire question. */
  async ackQuestion(code: string) {
    await this.page.getByTestId(`q-${code}-ack`).check()
  }

  /**
   * Selects countries in the country_multi_select_iso2 combobox.
   * The component renders options as <button> inside <div role="listbox">.
   * @param countries - Country names as they appear in the options list
   */
  async selectCountries(countries: string[]) {
    const input = this.page.getByPlaceholder('Type to search countries…')
    for (const country of countries) {
      await input.fill(country.slice(0, 6))
      await this.page.locator('[role="listbox"] button').filter({ hasText: country }).first().click()
      // After selection the input clears; wait briefly for state to settle
      await input.waitFor({ state: 'visible' })
    }
  }
}
