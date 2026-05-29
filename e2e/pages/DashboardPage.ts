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
    // Get the href and navigate directly — Next.js <Link> client-side navigation
    // can silently no-op in Playwright; page.goto() guarantees the navigation.
    const href = await this.continueApplicationLink.getAttribute('href')
    if (!href) throw new Error('continue-application link has no href')
    await this.page.goto(href)
  }
}
