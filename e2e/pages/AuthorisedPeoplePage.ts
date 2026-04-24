import { type Page, type Locator } from '@playwright/test'

export interface AuthorisedPersonData {
  firstName: string
  lastName: string
  role: string
  idFile: string
  addressFile: string
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
    await this.page.getByTestId(`${testId}-input`).setInputFiles(filePath)
    await this.page.getByTestId(testId).waitFor({ state: 'visible' })
  }

  async addPerson(data: AuthorisedPersonData) {
    await this.addApButton.click()

    await this.page.getByLabel('First name').fill(data.firstName)
    await this.page.getByLabel('Last name').fill(data.lastName)

    // Role may be a select or a text input depending on implementation
    const roleSelect = this.page.locator('select[name="role"]')
    const roleSelectCount = await roleSelect.count()
    if (roleSelectCount > 0) {
      await roleSelect.selectOption({ label: data.role })
    } else {
      await this.page.getByLabel('Role').fill(data.role)
    }

    // Upload ID document
    await this.uploadFile('ap-id-doc', data.idFile)

    // Upload proof of address
    await this.uploadFile('ap-address-doc', data.addressFile)

    await this.saveApButton.click()
  }
}
