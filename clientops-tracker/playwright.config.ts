import { defineConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const baseURL = process.env.VERIFY_URL ?? 'https://localhost:8443';
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
  outputDir: 'test-results/browser',
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/browser-results.json' }],
  ],
  metadata: {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    workingTreeDirty:
      execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
    target: baseURL,
    browser: process.env.BROWSER_CHANNEL ?? 'chromium',
  },
  use: {
    actionTimeout: 15_000,
    baseURL,
    // Only permitted for the loopback, disposable self-signed HTTPS fixture above.
    ignoreHTTPSErrors: true,
    channel: process.env.BROWSER_CHANNEL,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
