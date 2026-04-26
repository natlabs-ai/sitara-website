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

  /** Upload a file to any DocumentUploadControl on this step, with automatic retry on transient errors. */
  async uploadFile(testId: string, filePath: string) {
    const container = this.page.getByTestId(testId)
    const uploadedBtn = container.getByRole('button', { name: 'Uploaded' })
    const retryBtn = container.getByRole('button', { name: 'Retry upload' })

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.getByTestId(`${testId}-input`).setInputFiles(filePath)
      // Wait for either success ("Uploaded") or error ("Retry upload")
      await uploadedBtn.or(retryBtn).waitFor({ state: 'visible', timeout: 180_000 })
      if (await uploadedBtn.isVisible()) return
      // Error state — loop will retry
    }
    throw new Error(`Upload failed after 3 attempts for ${testId}`)
  }

  /** Dismiss the "Company details" modal if it appeared after a legal-existence upload. */
  async dismissCompanyDetailsModalIfOpen() {
    const modal = this.page.getByRole('dialog', { name: 'Company details (from business licence)' })
    if (await modal.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await modal.getByRole('button', { name: 'Cancel' }).click()
      await modal.waitFor({ state: 'hidden', timeout: 10_000 })
    }
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
    // Legal-existence upload triggers a company-details confirmation modal — dismiss it.
    await this.dismissCompanyDetailsModalIfOpen()
    await this.uploadFile('upload-constitutional', files.constitutional)
    // Section B auto-expands via a React useEffect once sectionAComplete=true.
    // The useEffect fires after the "Uploaded" state is committed to React,
    // so wait briefly for the visible container before uploading.
    await this.page.waitForSelector('[data-testid="upload-registered-address"]', { timeout: 30_000 })
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
