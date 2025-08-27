import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    trace: 'on-first-retry',
  },
  // Start both the app preview server and the mock agent
  webServer: [
    {
      command: 'npm run preview',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: true
    },
    {
      command: 'node tests/mock-agent/server.js',
      url: 'http://localhost:9009/healthz',
      timeout: 60_000,
      reuseExistingServer: true
    }
  ]
});