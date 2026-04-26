// e2e/playwright.config.ts
import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })

export default defineConfig({
  testDir: path.resolve(__dirname, 'specs'),
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  timeout: 1_800_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(__dirname, 'test-results/html'), open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'uvicorn app.main:app --port 8000',
      cwd: path.resolve(__dirname, '../../kora/backend'),
      url: 'http://localhost:8000/health',
      reuseExistingServer: true,
      env: { TESTING: 'true' },
      timeout: 30_000,
    },
    {
      command: 'next dev -p 3001',
      cwd: path.resolve(__dirname, '..'),
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
