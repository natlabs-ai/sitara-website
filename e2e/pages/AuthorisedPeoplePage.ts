import { type Page, type Locator } from '@playwright/test'

export interface AuthorisedPersonData {
  firstName: string
  lastName: string
  role: string
  idFile: string
  addressFile: string
  isPep?: boolean
  isSanctioned?: boolean
}

export class AuthorisedPeoplePage {
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

  get addApButton() {
    return this.page.getByTestId('add-ap-button')
  }

  get saveApButton() {
    return this.page.getByTestId('save-ap-button')
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

  async apCards(): Promise<Locator> {
    return this.page.getByTestId('ap-card')
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

  async addPerson(data: AuthorisedPersonData) {
    await this.addApButton.click()

    // Full Name (single combined field, id="full_name")
    await this.page.locator('#full_name').fill(`${data.firstName} ${data.lastName}`)

    // Role / Title (text input, id="role", label="Role / Title")
    await this.page.locator('#role').fill(data.role)

    // Upload ID document
    await this.uploadFile('ap-id-doc', data.idFile)

    // Upload proof of address (optional but we always provide it)
    await this.uploadFile('ap-address-doc', data.addressFile)

    // PEP declaration — first radio = Yes (index 0), second = No (index 1)
    const pepRadios = this.page.locator('input[name="signatory_is_pep"]')
    await pepRadios.nth(data.isPep ? 0 : 1).click()

    // Sanctions declaration
    const sanctionRadios = this.page.locator('input[name="signatory_is_sanctioned"]')
    await sanctionRadios.nth(data.isSanctioned ? 0 : 1).click()

    await this.saveApButton.click()
  }
}
