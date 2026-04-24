// e2e/fixtures/freshAccount.ts
import { test as base } from '@playwright/test'

export type FreshAccount = {
  email: string
  password: string
  /**
   * Call this at the end of a spec to signal it passed.
   * Teardown only deletes test data when the spec has called markPassed().
   */
  markPassed: () => void
}

export const test = base.extend<{ freshAccount: FreshAccount }>({
  freshAccount: async ({}, use) => {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const email    = `test-e2e-${suffix}@e2e.example.com`
    const password = 'E2eTestPass1!'

    let passed = false

    await use({ email, password, markPassed: () => { passed = true } })

    // Teardown: only clean up when the spec passed
    if (passed) {
      const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
      await fetch(`${backendUrl}/api/v1/test/cleanup`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch((err) => console.warn('Cleanup fetch failed:', err))
    }
  },
})

export { expect } from '@playwright/test'
