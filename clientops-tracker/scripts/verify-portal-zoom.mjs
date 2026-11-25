import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = process.env.VERIFY_URL ?? 'https://localhost:8443';
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
  process.env.E2E_ALLOW_DISPOSABLE_DEMO !== 'true'
)
  throw new Error('Use loopback VERIFY_URL and E2E_ALLOW_DISPOSABLE_DEMO=true.');
const directory = resolve(
  process.env.E2E_SCREENSHOT_DIR ?? process.env.UI_EVIDENCE_DIR ?? 'test-results/portal-zoom',
);
await mkdir(directory, { recursive: true });
const report = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  target: origin,
  method:
    'Chrome Settings page zoom, fresh temporary profiles. Not CSS zoom or viewport emulation.',
  authBudget: 'Three sign-ins total, one per role; no retries or account/data mutations.',
  screenReader: 'Human acceptance pending',
  measurements: [],
  checks: [],
  screenshots: [],
  result: 'running',
};

async function ready(page) {
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: /^(Loading|Checking session)/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Loading count', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
}
async function accessible(page, label) {
  expect(
    await page.evaluate(
      () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
    ),
    label,
  ).toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
    label,
  ).toEqual([]);
  report.checks.push(label);
}
async function capture(page, name) {
  await page.evaluate(() => globalThis.scrollTo({ top: 0, behavior: 'instant' }));
  const cdp = await page.context().newCDPSession(page);
  try {
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await writeFile(resolve(directory, name), Buffer.from(data, 'base64'));
    report.screenshots.push(name);
  } finally {
    await cdp.detach();
  }
}

try {
  for (const role of ['Admin', 'Developer', 'Client']) {
    const context = await chromium.launchPersistentContext('', {
      channel: process.env.BROWSER_CHANNEL || 'chromium',
      headless: true,
      ignoreHTTPSErrors: true,
      viewport: null,
      reducedMotion: 'reduce',
      colorScheme: 'light',
      args: ['--window-size=1440,1000'],
    });
    try {
      const errors = [];
      const settings = context.pages()[0];
      await settings.goto('chrome://settings/appearance');
      await settings.locator('#zoomLevel').selectOption('1');
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${origin}/login`);
      const login = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/auth/login' &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
      expect((await login).status(), 'One sign-in attempt per role').toBe(200);
      await expect(page).toHaveURL(`${origin}/dashboard`);
      await ready(page);
      const normal = await page.evaluate(() => ({
        width: globalThis.innerWidth,
        dpr: globalThis.devicePixelRatio,
      }));
      await settings.locator('#zoomLevel').selectOption('2');
      await page.reload();
      await ready(page);
      const zoom = await page.evaluate(() => ({
        width: globalThis.innerWidth,
        dpr: globalThis.devicePixelRatio,
      }));
      expect(zoom.dpr / normal.dpr).toBeCloseTo(2, 1);
      expect(zoom.width / normal.width).toBeCloseTo(0.5, 1);
      report.measurements.push({ role, normal, zoom });
      for (const theme of ['light', 'dark']) {
        await page.getByLabel('Account menu', { exact: true }).click();
        await page
          .getByRole('button', {
            name: `${theme === 'dark' ? 'Dark' : 'Light'} theme`,
            exact: true,
          })
          .click();
        await page.keyboard.press('Escape');
        await expect(page.getByLabel('Account menu', { exact: true })).toBeFocused();
        await page.reload();
        await ready(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const paths =
          role === 'Client'
            ? ['/dashboard', '/tickets', '/delivery', '/account', '/guide']
            : ['/dashboard'];
        for (const path of paths) {
          await page.goto(`${origin}${path}`);
          await ready(page);
          const current = await page.evaluate(() => ({
            width: globalThis.innerWidth,
            dpr: globalThis.devicePixelRatio,
          }));
          expect(current).toEqual(zoom);
          await accessible(page, `${role} ${theme} ${path} native 200%`);
          if (path === '/dashboard' || path === '/tickets' || path === '/account')
            await capture(
              page,
              `portal-native-200-${role.toLowerCase()}-${theme}-${path.slice(1)}.png`,
            );
        }
        const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
        await trigger.focus();
        await page.keyboard.press('Enter');
        const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
        await expect(drawer).toBeVisible();
        const controls = drawer
          .locator('a[href], button:not([disabled])')
          .filter({ visible: true });
        await expect(controls.first()).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(controls.last()).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(controls.first()).toBeFocused();
        await accessible(page, `${role} ${theme} navigation drawer native 200%`);
        if (role === 'Admin')
          await capture(page, `portal-native-200-admin-${theme}-navigation.png`);
        await page.keyboard.press('Escape');
        await expect(drawer).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await expect(page.locator('.shell-content')).not.toHaveAttribute('inert');
      }
      expect(errors, `${role} browser errors`).toEqual([]);
    } finally {
      await context.close();
    }
  }
  report.result = 'passed';
} catch (error) {
  report.result = 'failed';
  throw error;
} finally {
  await writeFile(resolve(directory, 'portal-native-200.json'), JSON.stringify(report, null, 2));
}
console.log(
  'Portal native 200% zoom, all three roles, both themes, keyboard drawer and axe checks passed. Human screen-reader acceptance remains pending.',
);
