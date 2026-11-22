import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './frontend/e2e',
  fullyParallel: true,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    colorScheme: 'dark',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run dev -w frontend',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
