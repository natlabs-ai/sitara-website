import { type Page } from '@playwright/test'

export class AccountStepPage {
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

  get modeSignupButton() {
    return this.page.getByTestId('mode-signup')
  }

  get modeLoginButton() {
    return this.page.getByTestId('mode-login')
  }

  get emailInput() {
    return this.page.getByTestId('account-email')
  }

  get emailOtpInput() {
    return this.page.getByTestId('email-otp-input')
  }

  get emailOtpSendButton() {
    return this.page.getByTestId('email-otp-send')
  }

  get emailVerifyButton() {
    return this.page.getByTestId('email-verify')
  }

  get phoneNationalInput() {
    return this.page.getByTestId('phone-national-input')
  }

  get phoneOtpInput() {
    return this.page.getByTestId('phone-otp-input')
  }

  get phoneOtpSendButton() {
    return this.page.getByTestId('phone-otp-send')
  }

  get phoneVerifyButton() {
    return this.page.getByTestId('phone-verify')
  }

  get passwordInput() {
    return this.page.getByTestId('account-password')
  }

  get confirmPasswordInput() {
    return this.page.getByTestId('account-confirm-password')
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

  /**
   * Full sign-up flow for DEV_MODE where clicking "Send" auto-fills the OTP.
   * Flow: mode-signup → email → send OTP → enter "000000" → verify →
   *        phone → send OTP → enter "000000" → verify → password + confirm
   * Does NOT click Next — the caller is responsible for advancing.
   */
  async signUp(email: string, password: string) {
    await this.modeSignupButton.click()

    // Email verification
    await this.emailInput.fill(email)
    await this.emailOtpSendButton.click()
    await this.emailOtpInput.fill('000000')
    await this.emailVerifyButton.click()

    // Phone verification (use a generic UAE test number)
    await this.phoneNationalInput.fill('501234567')
    await this.phoneOtpSendButton.click()
    await this.phoneOtpInput.fill('000000')
    await this.phoneVerifyButton.click()

    // Password
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(password)
  }
}
