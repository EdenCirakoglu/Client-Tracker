import { defineConfig } from '@playwright/test';

const baseURL = process.env.VERIFY_URL ?? 'http://localhost:8180';
if (
  !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname) ||
  process.env.E2E_ALLOW_DISPOSABLE_DEMO !== 'true'
) {
  throw new Error(
    'Browser tests mutate fictional demo data. Use loopback VERIFY_URL and explicitly set E2E_ALLOW_DISPOSABLE_DEMO=true. Never run against production.',
  );
}

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    actionTimeout: 15_000,
    baseURL,
    channel: process.env.BROWSER_CHANNEL,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
