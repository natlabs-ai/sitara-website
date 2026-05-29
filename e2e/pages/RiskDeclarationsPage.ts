import { type Page } from '@playwright/test'

export class RiskDeclarationsPage {
  constructor(private readonly page: Page) {}

  get nextButton() {
    return this.page.getByTestId('next-button')
  }

  async waitForStep() {
    // PEP question is always the first visible element on this step
    await this.page.waitForSelector('text=Are you a Politically Exposed Person')
  }

  async answerNo(question: 'pep' | 'sanctions' | 'thirdParty') {
    const labels: Record<typeof question, string> = {
      pep: 'Are you a Politically Exposed Person',
      sanctions: 'Are you subject to any sanctions',
      thirdParty: 'Will you be acting on behalf of a third party',
    }
    const section = this.page.locator('text=' + labels[question]).locator('../..')
    await section.getByRole('button', { name: 'No' }).click()
  }

  async clickNext() {
    await this.nextButton.click()
  }
}
