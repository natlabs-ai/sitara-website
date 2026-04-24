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

  /** Waits until the submit button is enabled and visible. */
  async waitForReady() {
    await this.page.waitForSelector('[data-testid="submit-button"]:not([disabled])')
  }

  async submit() {
    await this.submitButton.click()
  }
}
