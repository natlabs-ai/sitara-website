import { type Page } from '@playwright/test'

export interface RelationshipData {
  direction: string
  frequency: string
}

export class RelationshipPage {
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

  /**
   * Clicks a direction card identified by its data-value attribute.
   * Falls back to matching by visible text if no data-value match is found.
   */
  async selectDirection(direction: string) {
    const byValue = this.page.locator(`[data-value="${direction}"]`)
    const count = await byValue.count()
    if (count > 0) {
      await byValue.first().click()
    } else {
      await this.page.getByText(direction, { exact: false }).first().click()
    }
  }

  async selectFrequency(frequency: string) {
    await this.page.locator('select[name="frequency"]').selectOption({ label: frequency })
  }

  async fill(data: RelationshipData) {
    await this.selectDirection(data.direction)
    await this.selectFrequency(data.frequency)
  }
}
