import { chromium, expect as playwrightExpect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!process.env.VERIFY_URL || process.env.E2E_ALLOW_DISPOSABLE_DEMO !== 'true')
  throw new Error('Provide loopback VERIFY_URL and E2E_ALLOW_DISPOSABLE_DEMO=true.');
const target = new URL(process.env.VERIFY_URL);
const loopback = (url) =>
  ['http:', 'https:'].includes(url.protocol) &&
  ['localhost', '127.0.0.1'].includes(url.hostname) &&
  !url.username &&
  !url.password;
if (!loopback(target) || target.pathname !== '/' || target.search || target.hash)
  throw new Error('VERIFY_URL must be an HTTP(S) loopback origin without credentials or a path.');
const origin = target.origin;
const directory = resolve(process.env.UI_EVIDENCE_DIR ?? 'test-results/meridian-portal-captures');
const expect = playwrightExpect.configure({ timeout: 30_000 });
const roles = ['Admin', 'Developer', 'Client'];
const themes = ['light', 'dark'];
const viewports = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
];
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const manifest = {
  capturedAt: new Date().toISOString(),
  revision: git(['rev-parse', 'HEAD']),
  workingTreeDirty: Boolean(git(['status', '--porcelain'])),
  target: origin,
  channel: process.env.BROWSER_CHANNEL || 'chromium',
  sidebar: 'expanded',
  roles,
  themes,
  viewports,
  result: 'running',
  captures: [],
};

async function settled(page, pending) {
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(() => pending.size, { message: 'Dashboard API reads have finished' }).toBe(0);
  await expect(
    page
      .getByRole('status', { includeHidden: true })
      .filter({ hasText: /Loading|Checking|Finding/ }),
  ).toHaveCount(0);
  await expect(page.locator('[aria-label="Loading count"], [aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('alert', { includeHidden: true })).toHaveCount(0);
  await page.evaluate(async () => {
    await globalThis.document.fonts.ready;
    await new Promise((done) =>
      globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(done)),
    );
  });
  expect(await page.evaluate(() => globalThis.document.fonts.status)).toBe('loaded');
}

async function capture(page, pending, role, theme, viewport, filename, fullPage) {
  await settled(page, pending);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('.portal-shell')).toHaveClass(/\bshell-expanded\b/);
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.localStorage.getItem('clientops:sidebar'))).toBe(
    'expanded',
  );
  if (viewport.width === 1440)
    await expect(
      page.getByRole('button', { name: 'Collapse navigation', exact: true }),
    ).toBeVisible();
  else
    await expect(
      page.getByRole('button', { name: 'Open navigation', exact: true }),
    ).toHaveAttribute('aria-expanded', 'false');
  expect(page.viewportSize()).toEqual(viewport);
  await page.evaluate(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' });
    if (globalThis.document.activeElement instanceof globalThis.HTMLElement)
      globalThis.document.activeElement.blur();
  });
  await expect.poll(() => page.evaluate(() => globalThis.scrollY)).toBe(0);
  await page.mouse.move(0, 0);
  const capturedAt = new Date().toISOString();
  const bytes = await page.screenshot({
    path: resolve(directory, filename),
    fullPage,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
  manifest.captures.push({
    capturedAt,
    role,
    viewport,
    theme,
    filename,
    fullPage,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

await mkdir(directory, { recursive: true });
const manifestPath = resolve(directory, 'manifest.json');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
let browser;
try {
  browser = await chromium.launch({ channel: manifest.channel, headless: true });
  manifest.browserVersion = browser.version();
  for (const role of roles) {
    const context = await browser.newContext({
      baseURL: origin,
      ignoreHTTPSErrors: true,
      viewport: viewports[0],
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      colorScheme: 'light',
      serviceWorkers: 'block',
    });
    try {
      context.setDefaultTimeout(30_000);
      context.setDefaultNavigationTimeout(30_000);
      let signIns = 0;
      let blockedRequests = 0;
      let scriptErrors = 0;
      const pending = new Set();
      // Permit the one UI sign-in, but never create fixtures or change application records.
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const read = ['GET', 'HEAD', 'OPTIONS'].includes(request.method());
        const signIn =
          request.method() === 'POST' && url.pathname === '/api/auth/login' && signIns === 0;
        if (!loopback(url) || (!read && !signIn)) {
          blockedRequests += 1;
          await route.abort('blockedbyclient');
          return;
        }
        if (signIn) signIns += 1;
        await route.continue();
      });
      await context.addInitScript(() =>
        globalThis.localStorage.setItem('clientops:sidebar', 'expanded'),
      );
      const page = await context.newPage();
      page.on('pageerror', () => {
        scriptErrors += 1;
      });
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api/')) pending.add(request);
      });
      page.on('requestfinished', (request) => pending.delete(request));
      page.on('requestfailed', (request) => pending.delete(request));
      await page.goto('/login');
      const response = page.waitForResponse(
        (item) =>
          new URL(item.url()).pathname === '/api/auth/login' && item.request().method() === 'POST',
      );
      await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
      expect((await response).status(), 'Exactly one UI sign-in attempt per role').toBe(200);
      await settled(page, pending);
      await expect(
        page.getByLabel('Account menu', { exact: true }).getByText(role, { exact: true }),
      ).toBeVisible();
      for (const theme of themes) {
        await page.getByLabel('Account menu', { exact: true }).click();
        const picker = page.getByRole('button', {
          name: `${theme === 'dark' ? 'Dark' : 'Light'} theme`,
          exact: true,
        });
        await picker.click();
        await expect(picker).toHaveAttribute('aria-pressed', 'true');
        await page.keyboard.press('Escape');
        await expect(page.getByLabel('Account menu', { exact: true })).toBeFocused();
        await expect(picker).toBeHidden();
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          await capture(
            page,
            pending,
            role,
            theme,
            viewport,
            `dashboard-${role.toLowerCase()}-${theme}-${viewport.width}.png`,
            true,
          );
          if (role === 'Admin' && theme === 'dark' && viewport.width === 1440)
            await capture(
              page,
              pending,
              role,
              theme,
              viewport,
              'admin-dark-first-screen.png',
              false,
            );
        }
      }
      expect(signIns, `${role} sign-in budget`).toBe(1);
      expect(blockedRequests, 'No remote requests or non-login mutations are permitted').toBe(0);
      expect(scriptErrors, 'No unhandled browser errors').toBe(0);
    } finally {
      await context.close();
    }
  }
  expect(manifest.captures.filter((item) => item.fullPage)).toHaveLength(12);
  expect(manifest.captures.filter((item) => !item.fullPage)).toHaveLength(1);
  expect(new Set(manifest.captures.map((item) => item.filename)).size).toBe(13);
  expect(git(['rev-parse', 'HEAD']), 'Git revision must not change during capture').toBe(
    manifest.revision,
  );
  manifest.workingTreeDirty ||= Boolean(git(['status', '--porcelain']));
  manifest.result = 'passed';
} catch (error) {
  manifest.result = 'failed';
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    manifest.completedAt = new Date().toISOString();
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
console.log(
  `Captured ${manifest.captures.length} dashboard PNGs and manifest.json in ${directory}.`,
);
