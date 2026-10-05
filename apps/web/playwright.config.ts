import { defineConfig, devices } from '@playwright/test';
import { DEV_URL, PREVIEW_URL } from './e2e/urls';

const browserChannel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: DEV_URL,
    trace: 'retain-on-failure',
    ...(browserChannel ? { channel: browserChannel } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    // Dev server: exposes the window.__LIFE_SHIFT__ debug API the gameplay tests read.
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: DEV_URL,
      reuseExistingServer: !process.env.CI,
    },
    // Production build: smoke-tested for boot and console errors.
    {
      command: 'npm run build && npm run preview -- --port 4174 --strictPort',
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
