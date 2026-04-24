import { type Page } from '@playwright/test'

export interface CorporateSetupData {
  legalName: string
  jurisdiction: string
  registrationNumber: string
  entityType: string
  dateOfIncorporation: string
}

export class CorporateSetupPage {
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

  async fill(data: CorporateSetupData) {
    await this.page.getByLabel('Legal name').fill(data.legalName)

    // Jurisdiction is a country select
    await this.page.locator('select[name="jurisdiction"]').selectOption({ label: data.jurisdiction })

    // Date of incorporation
    await this.page.getByLabel('Date of incorporation').fill(data.dateOfIncorporation)

    // Registration number
    await this.page.getByLabel('Registration number').fill(data.registrationNumber)

    // Legal entity type select
    await this.page.locator('select[name="legal_entity_type"]').selectOption({ label: data.entityType })
  }
}
