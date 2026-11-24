import { defineConfig, devices } from '@playwright/test'

const PORT = 4791

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/photomate/`,
    // Service workers would cache between tests; the app must work without one anyway.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Safari's engine: most phones in the wild are iPhones, and WebKit differs most.
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'android', use: { ...devices['Pixel 7'] }, testMatch: /smoke|tools/ },
    { name: 'iphone', use: { ...devices['iPhone 13'] }, testMatch: /smoke|tools/ },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/photomate/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
