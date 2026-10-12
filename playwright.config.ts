import { defineConfig, devices } from '@playwright/test'

const production = process.env.PLAYWRIGHT_PRODUCTION === '1'
const baseURL = production ? 'http://127.0.0.1:5175/LittleEnglish850/' : 'http://127.0.0.1:5174/'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: production ? 'npm run preview -- --port 5175 --strictPort --base /LittleEnglish850/' : 'npm run dev -- --port 5174 --strictPort',
    url: baseURL,
    reuseExistingServer: !production && !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
  ],
})
