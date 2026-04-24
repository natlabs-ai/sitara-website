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
}
