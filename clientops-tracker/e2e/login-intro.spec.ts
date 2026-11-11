import { mkdir, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

const intro = (page: Page) => page.getByRole('dialog', { name: 'ClientOps Tracker', exact: true });

async function whileClockAdvances<T>(page: Page, action: () => Promise<T>): Promise<T> {
  let settled = false;
  const result = action();
  void result.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  // Axe and screenshots need animation frames even with a controlled dismissal clock.
  for (let frame = 0; !settled && frame < 75; frame += 1) await page.clock.runFor(16);
  expect(settled, 'Capture should finish within 1200ms of browser time').toBe(true);
  return result;
}

async function holdIntro(page: Page) {
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1000));
  await page.goto('/login');
  await expect(intro(page)).toBeVisible();
  await settleReveal(page);
}

async function settleReveal(page: Page) {
  // Capture the actual CSS animation at a reproducible mid-reveal frame.
  await intro(page).evaluate((element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 900;
    }
  });
}

test('first arrival reveals the exact logo, traps focus, completes and does not replay in the tab', async ({
  page,
}) => {
  await mkdir('test-results/logo-intro', { recursive: true });
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1000));
  await page.goto('/');
  await expect(intro(page)).toBeVisible();
  await expect(intro(page).getByRole('button')).toHaveCount(0);
  await expect(intro(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(intro(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(intro(page)).toBeFocused();
  await settleReveal(page);
  expect(
    (
      await whileClockAdvances(page, () =>
        new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze(),
      )
    ).violations,
  ).toEqual([]);
  await expect(intro(page).locator('img')).toHaveAttribute('src', '/brand/journal-v3.png');
  expect(
    await intro(page)
      .locator('img')
      .evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBe(240);
  await page.clock.runFor(2300);
  await expect(intro(page)).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeFocused();
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  await page.clock.resume();
  await page.screenshot({ path: 'test-results/logo-intro/login-after.png' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(intro(page)).not.toBeVisible();
  await expect(page.locator('img[src="/brand/journal-v3.png"]')).toHaveCount(1);
});

test('Escape dismisses immediately and leaves keyboard focus at sign-in', async ({ page }) => {
  await holdIntro(page);
  await expect(intro(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(intro(page)).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
});

test('Enter during the button-free intro does not submit the background login form', async ({
  page,
}) => {
  const loginRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/login')
      loginRequests.push(request.url());
  });
  await holdIntro(page);
  await expect(intro(page).getByRole('button')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(intro(page)).toBeVisible();
  expect(loginRequests).toEqual([]);
  await page.clock.runFor(2300);
  await expect(intro(page)).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeFocused();
});

test('reduced motion goes directly to sign-in, including when changed during the intro', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Light theme', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable();
  await expect(intro(page)).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await holdIntro(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(intro(page)).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeFocused();
});

test('unavailable preference storage never prevents sign-in', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get: () => {
        throw new DOMException('Storage unavailable', 'SecurityError');
      },
    });
  });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Light theme', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable();
  await expect(intro(page)).not.toBeVisible();
});

test('record destinations bypass the intro and survive sign-in; logout does not replay it', async ({
  page,
}) => {
  const destination = '/tickets?status=OPEN#queue';
  await page.goto(`/login?${new URLSearchParams({ next: destination })}`);
  await expect(intro(page)).not.toBeVisible();
  await page.getByRole('button', { name: 'Continue as Client', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/tickets\\?status=OPEN#queue$'));
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(intro(page)).not.toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable();
});

test('failed logo or API requests cannot leave a visitor behind an intro', async ({ page }) => {
  await page.route('**/brand/journal-v3.png', (route) => route.abort());
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } }),
  );
  await holdIntro(page);
  await page.clock.runFor(2300);
  await expect(intro(page)).not.toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable();
});

for (const view of [
  { name: 'desktop-light', width: 1440, height: 1000, theme: 'light' },
  { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
  { name: 'short-light', width: 768, height: 360, theme: 'light' },
]) {
  test(`button-free glass reveal fits ${view.name}`, async ({ page }) => {
    await mkdir('test-results/logo-intro', { recursive: true });
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.addInitScript((theme) => localStorage.setItem('clientops:theme', theme), view.theme);
    await holdIntro(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(intro(page).getByRole('button')).toHaveCount(0);
    await expect(intro(page).locator('img')).toBeInViewport();
    await expect(intro(page).getByText('ClientOps Tracker', { exact: true })).toBeInViewport();
    await whileClockAdvances(page, async () => {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
      ).toEqual([]);
      await page.screenshot({ path: `test-results/logo-intro/${view.name}.png` });
    });
    await page.keyboard.press('Escape');
    await expect(intro(page)).not.toBeVisible();
  });
}

test('native 200 percent browser zoom keeps the button-free intro readable', async ({
  baseURL,
}) => {
  const context = await chromium.launchPersistentContext('', {
    baseURL,
    channel: process.env.BROWSER_CHANNEL || 'chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: null,
    args: ['--window-size=1440,1000'],
  });
  try {
    const settings = context.pages()[0] ?? (await context.newPage());
    await settings.goto('chrome://settings/appearance');
    await settings.locator('#zoomLevel').selectOption('1');
    const page = await context.newPage();
    await page.goto('/login?next=%2Ftickets');
    const normal = await page.evaluate(() => ({ dpr: devicePixelRatio, width: innerWidth }));
    await settings.locator('#zoomLevel').selectOption('2');
    await holdIntro(page);
    const zoom = await page.evaluate(() => ({ dpr: devicePixelRatio, width: innerWidth }));
    expect(zoom.dpr / normal.dpr).toBeCloseTo(2, 1);
    expect(zoom.width / normal.width).toBeCloseTo(0.5, 1);
    await expect(intro(page).getByRole('button')).toHaveCount(0);
    await expect(intro(page).locator('img')).toBeInViewport();
    await expect(intro(page).getByText('ClientOps Tracker', { exact: true })).toBeInViewport();
    await expect(intro(page)).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await whileClockAdvances(page, async () => {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
      ).toEqual([]);
      const cdp = await context.newCDPSession(page);
      const capture = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      });
      await mkdir('test-results/logo-intro', { recursive: true });
      await writeFile(
        'test-results/logo-intro/native-200.png',
        Buffer.from(capture.data, 'base64'),
      );
      await writeFile(
        'test-results/logo-intro/native-200.json',
        JSON.stringify(
          {
            normal,
            zoom,
            method: 'Chrome appearance page zoom preference',
            screenReader: 'Not performed',
          },
          null,
          2,
        ),
      );
    });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeFocused();
  } finally {
    await context.close();
  }
});
