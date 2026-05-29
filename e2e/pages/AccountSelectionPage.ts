import { type Page } from '@playwright/test'

export class AccountSelectionPage {
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

  get businessRadio() {
    return this.page.getByRole('radio', { name: 'Business' })
  }

  get individualRadio() {
    return this.page.getByRole('radio', { name: 'Personal' })
  }

  get signatoryRadio() {
    return this.page.locator('#radio-signingRole-signatory')
  }

  get employeeRadio() {
    return this.page.locator('#radio-signingRole-employee')
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

  /** Selects business account type, signatory role, then advances to the next step. */
  async selectBusiness() {
    // Use check() instead of click() — for React controlled radios, check() correctly
    // triggers the synthetic onChange so React state updates and signingRole renders.
    await this.businessRadio.check()
    // Explicitly wait for the signingRole field to appear (showIf: accountType === 'business')
    await this.page.waitForSelector('#radio-signingRole-signatory', { state: 'visible' })
    await this.signatoryRadio.check()
    await this.clickNext()
  }

  /** Selects individual account type, then advances to the next step. */
  async selectIndividual() {
    await this.individualRadio.check()
    await this.clickNext()
  }
}
