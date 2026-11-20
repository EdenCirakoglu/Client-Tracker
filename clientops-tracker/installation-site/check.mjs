import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import './build.mjs';

const index = new URL('./dist/index.html', import.meta.url);
assert.deepEqual(readdirSync(new URL('.', index)).sort(), [
  'index.html',
  'journal-v3.png',
  'service.css',
]);
assert.equal(
  createHash('sha256')
    .update(readFileSync(new URL('journal-v3.png', index)))
    .digest('hex'),
  '4e84301ab7fa39a2f9a80e65eebd8b494d04677149224608304f972083cd47bd',
);
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || undefined });
try {
  for (const [width, height, colorScheme] of [
    [390, 844, 'dark'],
    [1440, 1000, 'light'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme });
    await page.goto(index.href);
    assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'ClientOps Tracker');
    assert.equal(await page.locator('form,script,iframe').count(), 0);
    assert.equal(
      await page.getByRole('link', { name: 'Try the fictional example' }).getAttribute('href'),
      'https://proud-credit-1b94.eden-cirakoglu.workers.dev/',
    );
    assert(
      await page.locator('header img').evaluate((img) => img.complete && img.naturalWidth === 240),
    );
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').textContent(), 'Skip to the installation offer');
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash, '#offer');
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(
  'Static asset allowlist, canonical logo, offer navigation, mobile/dark and desktop/light passed.',
);
