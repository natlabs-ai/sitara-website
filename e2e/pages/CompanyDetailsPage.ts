import { type Page } from '@playwright/test'

/**
 * CompanyDetailsPage covers the `companyDetails` wizard step, which renders
 * BusinessDocumentsStep — a set of document upload controls.
 *
 * All upload testids follow the pattern:
 *   container: data-testid="{testId}"
 *   hidden input: data-testid="{testId}-input"
 */
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

  /** Upload a file to any DocumentUploadControl on this step. */
  async uploadFile(testId: string, filePath: string) {
    await this.page.getByTestId(`${testId}-input`).setInputFiles(filePath)
    // Wait for the container to reflect a non-idle state (uploading or success)
    await this.page.getByTestId(testId).waitFor({ state: 'visible' })
  }

  /** Upload all required business documents. */
  async uploadDocuments(files: {
    legalExistence: string
    constitutional: string
    registeredAddress: string
    taxRegistration: string
    activityEvidence?: string
    preciousMetalsPermit?: string
  }) {
    await this.uploadFile('upload-legal-existence', files.legalExistence)
    await this.uploadFile('upload-constitutional', files.constitutional)
    await this.uploadFile('upload-registered-address', files.registeredAddress)
    await this.uploadFile('upload-tax-registration', files.taxRegistration)
    if (files.activityEvidence) {
      await this.uploadFile('upload-activity-evidence', files.activityEvidence)
    }
    if (files.preciousMetalsPermit) {
      await this.uploadFile('upload-precious-metals', files.preciousMetalsPermit)
    }
  }
}
