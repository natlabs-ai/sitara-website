import { type Page } from '@playwright/test'

export class LoginPage {
  constructor(private readonly page: Page) {}

  get emailInput() {
    return this.page.getByTestId('login-email')
  }

  get passwordInput() {
    return this.page.getByTestId('login-password')
  }

  get submitButton() {
    return this.page.getByTestId('login-submit')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
