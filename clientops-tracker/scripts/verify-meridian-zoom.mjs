import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = process.env.VERIFY_URL ?? 'https://localhost:8443';
const ticket = process.env.MERIDIAN_TICKET_ID;
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) ||
  process.env.E2E_ALLOW_DISPOSABLE_DEMO !== 'true' ||
  !/^[a-f0-9-]{36}$/.test(ticket ?? '')
)
  throw new Error(
    'Provide a loopback VERIFY_URL, E2E_ALLOW_DISPOSABLE_DEMO=true and a pending demo scope MERIDIAN_TICKET_ID.',
  );
const directory = resolve(process.env.UI_EVIDENCE_DIR ?? 'test-results/meridian-zoom');
await mkdir(directory, { recursive: true });
const context = await chromium.launchPersistentContext('', {
  channel: process.env.BROWSER_CHANNEL || 'chromium',
  headless: true,
  ignoreHTTPSErrors: true,
  viewport: null,
  args: ['--window-size=1440,1000'],
});
const report = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  method: 'Chrome Settings page zoom, fresh temporary profile. Not CSS zoom or viewport emulation.',
  screenshots: [],
  screenReader: 'Human acceptance pending',
};
try {
  const settings = context.pages()[0];
  await settings.goto('chrome://settings/appearance');
  await settings.locator('#zoomLevel').selectOption('1');
  const page = await context.newPage();
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: 'Continue as Client', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto(`${origin}/tickets/${ticket}`);
  await expect(page.getByRole('heading', { name: 'Revision River' })).toBeVisible();
  const normal = await page.evaluate(() => ({
    width: globalThis.innerWidth,
    dpr: globalThis.devicePixelRatio,
  }));
  await settings.locator('#zoomLevel').selectOption('2');
  await page.reload();
  const zoom = await page.evaluate(() => ({
    width: globalThis.innerWidth,
    dpr: globalThis.devicePixelRatio,
  }));
  expect(zoom.dpr / normal.dpr).toBeCloseTo(2, 1);
  expect(zoom.width / normal.width).toBeCloseTo(0.5, 1);
  report.normal = normal;
  report.zoom = zoom;
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => globalThis.localStorage.setItem('clientops:theme', theme),
      theme,
    );
    await page.reload();
    const river = page.getByRole('list', { name: 'Scope revision history' });
    const current = river.locator('button[aria-current="step"]');
    await current.focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    await expect(current).toBeFocused();
    expect(
      await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: /^Approve revision \d+$/, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox').focus();
    await page.keyboard.press('Space');
    await expect(dialog.getByRole('checkbox')).toBeChecked();
    await expect(dialog.getByRole('checkbox')).toBeInViewport();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    const cdp = await context.newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const name = `meridian-native-200-${theme}.png`;
    await writeFile(resolve(directory, name), Buffer.from(data, 'base64'));
    report.screenshots.push(name);
    await cdp.detach();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Approve revision \d+$/, exact: true }),
    ).toBeFocused();
  }
  report.result = 'passed';
} finally {
  await context.close();
}
await writeFile(resolve(directory, 'acceptance.json'), JSON.stringify(report, null, 2));
console.log(
  'Meridian native 200% zoom, keyboard focus and dialog axe checks passed. Human screen-reader acceptance remains pending.',
);
