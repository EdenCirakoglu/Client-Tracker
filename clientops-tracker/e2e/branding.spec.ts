import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('journal identity survives themes, collapse and mobile navigation without duplicate names', async ({
  page,
  request,
}) => {
  const asset = await request.get('/brand/journal-v3.png');
  expect(asset.ok()).toBe(true);
  expect(
    createHash('sha256')
      .update(await asset.body())
      .digest('hex'),
  ).toBe('4e84301ab7fa39a2f9a80e65eebd8b494d04677149224608304f972083cd47bd');
  await mkdir('test-results/branding', { recursive: true });
  for (const theme of ['Light', 'Dark']) {
    await page.goto('/login');
    await page.getByRole('button', { name: `${theme} theme`, exact: true }).click();
    const mark = page.locator('img[src="/brand/journal-v3.png"]');
    await expect(mark).toHaveCount(1);
    await expect(mark).toHaveAttribute('alt', '');
    expect(await mark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(240);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/brand/journal-v3.png');
    await page.screenshot({ path: `test-results/branding/login-${theme.toLowerCase()}.png` });
    await page.goto('/forgot-password');
    await expect(page.getByRole('link', { name: 'ClientOps Tracker', exact: true })).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
  }
  await page.goto('/login');
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as Client', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next decision' })).toBeVisible();
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await page.getByLabel('Account menu').click();
  await page.screenshot({ path: 'test-results/branding/shell-dark.png' });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
  const home = page.getByRole('link', { name: 'ClientOps Tracker home', exact: true });
  await expect(home).toHaveCount(1);
  await home.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.screenshot({ path: 'test-results/branding/collapsed.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(home).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/branding/mobile-header.png' });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
  await expect
    .poll(async () => (await page.getByRole('dialog', { name: 'Navigation' }).boundingBox())?.x)
    .toBe(0);
  await expect(page.getByRole('link', { name: 'ClientOps Tracker home', exact: true })).toHaveCount(
    1,
  );
  await page.screenshot({ path: 'test-results/branding/mobile-drawer.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
});

test('fictional walkthrough is signed-out, API-free and keeps simulation separate from delivery', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  const scriptErrors: string[] = [];
  page.on('pageerror', (error) => scriptErrors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.goto('/walkthrough/index.html');
  await expect(page.getByRole('heading', { name: /Shipment search/ })).toBeVisible();
  await page.getByRole('link', { name: 'Try the example', exact: true }).click();
  await expect(page.locator('#review')).toBeFocused();
  await page.getByLabel('Changes requested', { exact: true }).fill('Active NS-1042 still fails.');
  await page.getByRole('button', { name: 'Simulate requesting changes' }).click();
  await expect(page.getByRole('status')).toContainText('Simulated feedback recorded');
  await expect(page.locator('#acceptance')).toHaveText('Changes requested (simulated)');
  await expect(page.getByText('Resolved by the team', { exact: true })).toBeVisible();
  await expect(page.getByText('Release 1.5.0-demo shipped', { exact: true }).first()).toBeVisible();
  for (const theme of ['dark', 'light', 'system']) {
    await page.getByLabel('Appearance').selectOption(theme);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
  }
  await page.reload();
  await expect(page.getByLabel('Appearance')).toHaveValue('system');
  await expect(page.locator('#acceptance')).toHaveText('Awaiting confirmation');
  expect(apiRequests).toEqual([]);
  expect(scriptErrors).toEqual([]);
  await expect(page.getByRole('link', { name: 'Self-host with Docker' })).toHaveAttribute(
    'href',
    'https://github.com/EdenCirakoglu/Client-Tracker/blob/main/clientops-tracker/docs/DEPLOYMENT.md',
  );
});
