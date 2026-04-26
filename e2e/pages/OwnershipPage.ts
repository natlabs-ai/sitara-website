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
    const container = this.page.getByTestId(testId)
    const uploadedBtn = container.getByRole('button', { name: 'Uploaded' })
    const retryBtn = container.getByRole('button', { name: 'Retry upload' })

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.getByTestId(`${testId}-input`).setInputFiles(filePath)
      // Wait for either success ("Uploaded") or error ("Retry upload")
      await uploadedBtn.or(retryBtn).waitFor({ state: 'visible', timeout: 180_000 })
      if (await uploadedBtn.isVisible()) return
    }
    throw new Error(`Upload failed after 3 attempts for ${testId}`)
  }

  async addIndividualOwner(data: IndividualOwnerData) {
    await this.addOwnerButton.click()

    // Select "Individual" from the Owner Type native <select id="owner_type">
    await this.page.locator('#owner_type').selectOption('individual')

    // Wait for individual fields to appear (conditional on owner_type === 'individual')
    await this.page.waitForSelector('#individual_full_name')

    // Full Name (single combined field)
    await this.page.locator('#individual_full_name').fill(`${data.firstName} ${data.lastName}`)

    // Nationality — GoldCombobox with placeholder="Select country..."
    const nationalityInput = this.page.getByPlaceholder('Select country...')
    await nationalityInput.click()
    await nationalityInput.fill(data.nationality.slice(0, 5))
    await this.page.locator('ul button').filter({ hasText: data.nationality }).first().click()

    // Date of birth (date input, id="individual_date_of_birth")
    await this.page.locator('#individual_date_of_birth').fill(data.dob)

    // Ownership percentage (number input, id="ownership_percentage")
    await this.page.locator('#ownership_percentage').fill(String(data.ownershipPct))

    // Upload ID document
    await this.uploadFile('owner-id-doc', data.idFile)

    // Upload proof of address
    await this.uploadFile('owner-address-doc', data.addressFile)

    await this.saveOwnerButton.click()
  }
}
