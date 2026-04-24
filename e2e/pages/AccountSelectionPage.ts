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
    return this.page.locator('#radio-accountType-business')
  }

  get individualRadio() {
    return this.page.locator('#radio-accountType-individual')
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
    await this.businessRadio.click()
    await this.signatoryRadio.click()
    await this.clickNext()
  }

  /** Selects individual account type, then advances to the next step. */
  async selectIndividual() {
    await this.individualRadio.click()
    await this.clickNext()
  }
}
