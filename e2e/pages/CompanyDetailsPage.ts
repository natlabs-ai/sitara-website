import { type Page } from '@playwright/test'

export interface CompanyDetailsData {
  street: string
  city: string
  country: string
  phone: string
}

export class CompanyDetailsPage {
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

  async fill(data: CompanyDetailsData) {
    await this.page.getByLabel('Street address').fill(data.street)
    await this.page.getByLabel('City').fill(data.city)

    // Country is a select rendered by FieldRenderer
    await this.page.locator('select[name="country"]').selectOption({ label: data.country })

    await this.page.getByLabel('Phone number').fill(data.phone)
  }
}
