import { chromium, expect as baseExpect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const before = process.argv.includes('--before');
const expect = baseExpect.configure({ timeout: 15000 });
const origin = process.env.VERIFY_URL ?? 'https://localhost:8452';
if (!/^https:\/\/localhost:\d+$/.test(origin) || process.env.E2E_ALLOW_DISPOSABLE_DEMO !== 'true')
  throw new Error('Explicit disposable loopback HTTPS verification is required.');
const directory = resolve(`test-results/ui-${before ? 'before' : 'acceptance'}`);
const fixture = new URL(origin).port === '8452' ? 'clientops-ops' : 'clientops-hardening';
mkdirSync(directory, { recursive: true });
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
const evidence = {
  revision,
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  checkedAt: new Date().toISOString(),
  stage: before ? 'before' : 'after',
  runtimeImages: Object.fromEntries(
    ['api', 'web'].map((app) => [
      app,
      execFileSync('docker', ['inspect', `${fixture}-${app}-1`, '--format', '{{.Image}}'], {
        encoding: 'utf8',
      }).trim(),
    ]),
  ),
  screens: [],
  screenReader: 'Manual acceptance pending',
};
async function screenshot(page, name, fullPage = true) {
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(directory, `${name}.png`),
    fullPage,
    animations: 'disabled',
  });
  evidence.screens.push(name);
}
async function login(page, role) {
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  await expect(page.getByText('Loading tickets...', { exact: true })).toHaveCount(0);
}
try {
  for (const role of ['Admin', 'Developer', 'Client']) {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await ctx.newPage();
    await login(page, role);
    await screenshot(page, `${role.toLowerCase()}-dashboard`);
    await page.goto(`${origin}/tickets`);
    await expect(page.getByRole('table')).toBeVisible();
    if (role === 'Admin') {
      await screenshot(page, 'desktop-tickets');
      await page.locator('tbody a').first().click();
      await expect(page.getByRole('heading', { name: 'Assisted triage' })).toBeVisible();
      await screenshot(page, 'ticket-detail');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/dashboard`);
    await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
    await expect(page.getByText('Loading tickets...', { exact: true })).toHaveCount(0);
    await screenshot(page, `${role.toLowerCase()}-mobile-dashboard`, false);
    if (!before) {
      const action = page
        .getByRole('region', { name: 'Needs attention' })
        .locator('li')
        .first()
        .locator('a')
        .last();
      await expect(action).toBeInViewport();
      expect(await page.getByText('0d since opened', { exact: true }).count()).toBe(0);
    }
    await page.goto(`${origin}/tickets`);
    await expect(page.getByRole('table')).toBeVisible();
    await screenshot(page, `${role.toLowerCase()}-mobile-tickets`, false);
    if (!before) {
      await expect(page.locator('tbody a').first()).toBeInViewport();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
      await page.getByRole('region', { name: 'Records table' }).focus();
      await page.keyboard.press('End');
      await expect(page.getByRole('region', { name: 'Records table' })).toBeFocused();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

if (!before) {
  // Change the real browser's page-zoom preference, not CSS zoom or viewport emulation.
  const native = await chromium.launchPersistentContext('', {
    channel: process.env.BROWSER_CHANNEL || 'chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: null,
    args: ['--window-size=1440,1000'],
  });
  try {
    const settings = native.pages()[0];
    await settings.goto('chrome://settings/appearance');
    await settings.locator('#zoomLevel').selectOption('1');
    const page = await native.newPage();
    await login(page, 'Admin');
    const normal = await page.evaluate(() => ({
      dpr: globalThis.devicePixelRatio,
      width: globalThis.innerWidth,
      outer: globalThis.outerWidth,
    }));
    await settings.locator('#zoomLevel').selectOption('2');
    await page.reload();
    const zoom = await page.evaluate(() => ({
      dpr: globalThis.devicePixelRatio,
      width: globalThis.innerWidth,
      outer: globalThis.outerWidth,
    }));
    expect(zoom.dpr / normal.dpr).toBeCloseTo(2, 1);
    expect(zoom.width / normal.width).toBeCloseTo(0.5, 1);
    const cdp = await native.newCDPSession(page);
    const nativeCapture = async (name) => {
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const png = Buffer.from(shot.data, 'base64');
      expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(Math.floor(zoom.width * zoom.dpr));
      writeFileSync(resolve(directory, `${name}.png`), png);
      evidence.screens.push(name);
    };
    for (const route of ['/dashboard', '/tickets', '/users', '/account']) {
      await page.goto(`${origin}${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.getByText(/^(Loading(?: \w+)?|Checking session)\.\.\.$/)).toHaveCount(0);
      expect(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
        ),
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
      await nativeCapture(`native-200-${route.slice(1)}`);
    }
    await page.getByLabel('Current password', { exact: true }).focus();
    const field = await page.getByLabel('Current password', { exact: true }).boundingBox();
    const header = await page.locator('header').boundingBox();
    expect(field.y).toBeGreaterThanOrEqual(header.y + header.height);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => globalThis.document.activeElement?.tagName)).toBe('INPUT');
    await nativeCapture('native-200-keyboard-focus');
    evidence.nativeZoom = {
      normal,
      zoom,
      browser: await native.browser().version(),
      method: 'Chrome Settings Page zoom 200%, temporary isolated profile',
    };
  } finally {
    await native.close();
  }
}
writeFileSync(resolve(directory, 'acceptance.json'), JSON.stringify(evidence, null, 2));
console.log(
  `${before ? 'Before screenshots' : 'UI, keyboard, axe and native 200% zoom acceptance'} captured in ${directory}`,
);
