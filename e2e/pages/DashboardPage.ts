import { type Page } from '@playwright/test'

export class DashboardPage {
  constructor(private readonly page: Page) {}

  get logoutButton() {
    return this.page.getByTestId('logout-button')
  }

  get continueApplicationLink() {
    return this.page.getByTestId('continue-application')
  }

  async waitForPage() {
    await this.page.waitForSelector('[data-testid="logout-button"]')
  }

  async logout() {
    await this.logoutButton.click()
  }

  async continueApplication() {
    await this.continueApplicationLink.click()
  }
}
