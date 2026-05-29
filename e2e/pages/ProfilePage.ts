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
    sourceOfIncome: string
    services: string[]
  }) {
    await this.page.locator('#occupation').fill(occupation)
    await this.page.locator('#sourceOfIncome').fill(sourceOfIncome)
    for (const label of services) {
      await this.page.getByRole('button', { name: label }).click()
    }
  }

  async clickNext() {
    await this.nextButton.click()
  }
}
