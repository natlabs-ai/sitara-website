import { type Page, type Locator } from '@playwright/test'

export interface IndividualOwnerData {
  firstName: string
  lastName: string
  nationality: string
  dob: string
  ownershipPct: number
  idFile: string
  addressFile: string
}

export class OwnershipPage {
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

  get addOwnerButton() {
    return this.page.getByTestId('add-owner-button')
  }

  get saveOwnerButton() {
    return this.page.getByTestId('save-owner-button')
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

  async ownerCards(): Promise<Locator> {
    return this.page.getByTestId('owner-card')
  }

  async uploadFile(testId: string, filePath: string) {
    await this.page.getByTestId(`${testId}-input`).setInputFiles(filePath)
    await this.page.getByTestId(testId).waitFor({ state: 'visible' })
  }

  async addIndividualOwner(data: IndividualOwnerData) {
    await this.addOwnerButton.click()

    // Fill individual owner fields in the modal
    await this.page.getByLabel('First name').fill(data.firstName)
    await this.page.getByLabel('Last name').fill(data.lastName)

    // Nationality select
    await this.page.locator('select[name="nationality"]').selectOption({ label: data.nationality })

    // Date of birth
    await this.page.getByLabel('Date of birth').fill(data.dob)

    // Ownership percentage
    await this.page.getByLabel('Ownership percentage').fill(String(data.ownershipPct))

    // Upload ID document
    await this.uploadFile('owner-id-doc', data.idFile)

    // Upload proof of address
    await this.uploadFile('owner-address-doc', data.addressFile)

    await this.saveOwnerButton.click()
  }
}
