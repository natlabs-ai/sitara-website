import { type Page } from '@playwright/test'

export interface RelationshipData {
  /** e.g. 'inbound' | 'outbound' | 'bidirectional' | 'processing_only' | 'intermediary_only' | 'other' */
  direction: string
  /** Array of product values: 'dore' | 'bars' | 'scrap' | 'jewellery' | 'coins' | 'other' */
  products: string[]
  /** 'adhoc' | 'monthly' | 'weekly' | 'daily' */
  frequency: string
  /** '<50k' | '50k-250k' | '250k-1m' | '>1m' */
  valueBand: string
  /** e.g. ['bank_transfer'] */
  paymentMethods: string[]
}

const DIRECTION_LABELS: Record<string, string> = {
  inbound: 'Inbound to us',
  outbound: 'Outbound from us',
  bidirectional: 'Bidirectional',
  processing_only: 'Processing only',
  intermediary_only: 'Intermediary only',
  other: 'Other',
}

const PRODUCT_LABELS: Record<string, string> = {
  dore: 'Doré',
  bars: 'Refined bars',
  scrap: 'Scrap',
  jewellery: 'Jewellery',
  coins: 'Coins',
  other: 'Other',
}

const PAYMENT_LABELS: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  lc: 'Letter of Credit (LC)',
  cash: 'Cash',
  other: 'Other',
}

export class RelationshipPage {
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
    // Wait for content unique to this step — the frequency <select> element.
    // Do NOT use next-button: it lives in the persistent toolbar and is always
    // present, so it resolves immediately even while ownership is still shown.
    await this.page.waitForSelector('#relationship_frequency')
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

  async fill(data: RelationshipData) {
    // Direction — card-style button, match by visible title text
    const dirLabel = DIRECTION_LABELS[data.direction] ?? data.direction
    await this.page.getByRole('button', { name: new RegExp(dirLabel) }).first().click()

    // Products — pill buttons
    for (const product of data.products) {
      const label = PRODUCT_LABELS[product] ?? product
      await this.page.getByRole('button', { name: label }).click()
    }

    // Frequency — native <select id="relationship_frequency">
    await this.page.locator('#relationship_frequency').selectOption(data.frequency)

    // Value band — native <select id="relationship_value_band_usd">
    await this.page.locator('#relationship_value_band_usd').selectOption(data.valueBand)

    // Payment methods — pill buttons
    for (const method of data.paymentMethods) {
      const label = PAYMENT_LABELS[method] ?? method
      await this.page.getByRole('button', { name: label }).click()
    }
  }
}
