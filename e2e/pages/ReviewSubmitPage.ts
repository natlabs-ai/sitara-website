import { type Page } from '@playwright/test'

export class ReviewSubmitPage {
  constructor(private readonly page: Page) {}

  get submitButton() {
    return this.page.getByTestId('submit-button')
  }

  get backButton() {
    return this.page.getByTestId('back-button')
  }

  get saveAndExitButton() {
    return this.page.getByTestId('save-exit-button')
  }

  async clickBack() {
    await this.backButton.click()
  }

  async clickSaveAndExit() {
    await this.saveAndExitButton.click()
  }

  /** Checks all declaration checkboxes and waits until the submit button is enabled. */
  async waitForReady() {
    await this.page.getByTestId('declaration-accept').check()
    // Individual accounts have two additional checkboxes; check them if present
    const privacy = this.page.getByTestId('privacy-policy-accept')
    if (await privacy.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await privacy.check()
    }
    const terms = this.page.getByTestId('terms-accept')
    if (await terms.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await terms.check()
    }
    await this.page.waitForSelector('[data-testid="submit-button"]:not([disabled])')
  }

  async submit() {
    await this.submitButton.click()
  }
}
