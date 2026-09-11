import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function capture(page: Page, name: string) {
  const dir = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/screenshots');
  await mkdir(dir, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(dir, `ui-${name}.png`),
    fullPage: !['dashboard-390', 'mobile-navigation'].includes(name),
    animations: 'disabled',
  });
}
async function accessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({ target: node.target, reason: node.failureSummary })),
    })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function login(page: Page, role: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Needs attention' }).getByText('Loading tickets...'),
  ).toHaveCount(0);
}

test('role queues, metric destinations and URL filters agree with authorised records', async ({
  browser,
}) => {
  for (const role of ['Admin', 'Developer', 'Client']) {
    const context = await browser.newContext({
      baseURL: process.env.VERIFY_URL ?? 'https://localhost:8443',
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await login(page, role);
    const metrics = (await (await page.request.get('/api/dashboard/metrics')).json()).data;
    const queue = page.getByRole('region', { name: 'Needs attention' });
    const selection =
      role === 'Admin' ? 'Unassigned' : role === 'Developer' ? 'My work' : 'Your reply needed';
    await expect(queue.getByRole('button', { name: selection, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    if (role === 'Client') {
      expect(metrics).not.toHaveProperty('developerWorkload');
      await expect(page.getByRole('heading', { name: 'Developer workload' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Public updates' })).toBeVisible();
      const feed = (await (await page.request.get('/api/dashboard/activity')).json()).data;
      expect(JSON.stringify(feed)).not.toMatch(/INTERNAL_COMMENT|TRIAGE|Bluewave/);
    }
    await accessible(page);
    await capture(page, `${role.toLowerCase()}-dashboard`);
    const viewAll = await queue
      .getByRole('link', { name: 'View all', exact: true })
      .getAttribute('href');
    await queue.getByRole('link', { name: 'View all', exact: true }).click();
    await expect.poll(() => new URL(page.url()).search).toBe(new URL(viewAll!, page.url()).search);
    await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
    for (const [label, key, query] of [
      [
        role === 'Client' ? 'Active requests' : 'Unresolved',
        'unresolvedTickets',
        'status=UNRESOLVED',
      ],
      ['Critical unresolved', 'criticalTickets', 'status=UNRESOLVED&priority=CRITICAL'],
      [
        role === 'Client' ? 'Your reply needed' : 'Waiting for client',
        'ticketsWaitingForClient',
        'status=WAITING_FOR_CLIENT',
      ],
      ['Resolved this month', 'resolvedTicketsThisMonth', `resolvedMonth=${metrics.resolvedMonth}`],
    ]) {
      await page.goto('/dashboard');
      await page.getByRole('link', { name: `${label}: ${metrics[key!]}`, exact: true }).click();
      await expect.poll(() => new URL(page.url()).search.slice(1)).toBe(query);
      const result = (await (await page.request.get(`/api/tickets/queue?${query}`)).json()).data;
      expect(result.total).toBe(metrics[key!]);
      if (result.total)
        await expect(page.getByRole('status')).toHaveText(`${result.total} tickets found`);
      else await expect(page.getByRole('heading', { name: 'No tickets found' })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Tickets', exact: true })).toBeVisible();
      expect(new URL(page.url()).search.slice(1)).toBe(query);
    }
    await page.getByRole('link', { name: 'Reset filters' }).click();
    await page.getByRole('combobox', { name: 'Filter by priority' }).selectOption('HIGH');
    await expect(page).toHaveURL(/priority=HIGH/);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Filter by priority' })).toHaveValue('HIGH');
    await context.close();
  }
});

test('theme and navigation preferences work across responsive portal and account screens', async ({
  page,
}) => {
  await login(page, 'Admin');
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  await page.mouse.move(700, 90);
  await page.getByRole('link', { name: 'Tickets', exact: true }).focus();
  await expect(page.locator('.nav-tooltip').filter({ hasText: /^Tickets$/ })).toBeVisible();
  const tooltip = await page
    .locator('.nav-tooltip')
    .filter({ hasText: /^Tickets$/ })
    .boundingBox();
  expect(tooltip!.width).toBeGreaterThan(tooltip!.height);
  await capture(page, 'collapsed-navigation');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('clientops:sidebar'))).toBe('collapsed');
  await page.getByLabel('Account menu', { exact: true }).click();
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Account menu', { exact: true })).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('clientops:theme'))).toBe('dark');
  for (const route of [
    '/dashboard',
    '/tickets',
    '/clients',
    '/projects',
    '/releases',
    '/users',
    '/account',
  ]) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText(/^(Loading(?: \w+)?|Checking session)\.\.\.$/)).toHaveCount(0);
    await accessible(page);
    await capture(page, `dark-${route.slice(1)}`);
    if (route === '/users') {
      await page.setViewportSize({ width: 390, height: 844 });
      await accessible(page);
      const accountsTable = page.getByRole('region', { name: 'Accounts table', exact: true });
      await accountsTable.focus();
      await page.keyboard.press('End');
      await expect(accountsTable).toBeFocused();
      await capture(page, 'mobile-accounts');
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
  await page.goto('/tickets');
  await page.getByRole('table').waitFor();
  await page.locator('tbody a[href^="/tickets/"]').first().click();
  await expect(page.getByRole('heading', { name: 'Assisted triage' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tickets', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await accessible(page);
  await capture(page, 'dark-ticket-detail');
  for (const width of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width === 1280 ? 600 : 900 });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
    await expect(page.getByText('Loading tickets...', { exact: true })).toHaveCount(0);
    await accessible(page);
    await capture(page, `dashboard-${width}`);
    if (width === 390) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await capture(page, 'mobile-navigation');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
      const firstLink = page.getByRole('region', { name: 'Needs attention' }).locator('li').first();
      expect(await firstLink.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 768, height: 500 }); // Effective CSS width at 200% desktop zoom.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await accessible(page);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  for (const route of ['/login', '/forgot-password', '/set-password', '/reset-password']) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    await accessible(page);
    await capture(page, `dark-${route.slice(1)}`);
  }
  await page.getByRole('button', { name: 'System theme', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('failed refresh is not an empty queue; long names and focused controls remain usable', async ({
  page,
  browser,
}) => {
  await login(page, 'Admin');
  await page.route('**/api/dashboard/metrics', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'UNAVAILABLE', message: 'Overview temporarily unavailable.' },
      }),
    }),
  );
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Overview temporarily unavailable.',
  );
  await expect(page.getByRole('link', { name: /^Unresolved:/ })).toHaveCount(0);
  await page.unroute('**/api/dashboard/metrics');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  await page.route('**/api/tickets/queue?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'UNAVAILABLE', message: 'Tickets temporarily unavailable.' },
      }),
    }),
  );
  const queue = page.getByRole('region', { name: 'Needs attention' });
  await queue.getByRole('button', { name: 'Critical', exact: true }).click();
  await expect(queue.getByRole('alert')).toContainText('Tickets temporarily unavailable.');
  await expect(queue.getByRole('heading', { name: 'Nothing needs attention here' })).toHaveCount(0);
  await page.unroute('**/api/tickets/queue?*');
  await queue.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(queue.getByRole('list')).toBeVisible();
  const allClients = (await (await page.request.get('/api/clients')).json()).data;
  const organisation = allClients.find((item: { name: string }) =>
    item.name.startsWith('Northstar'),
  );
  const records = (await (await page.request.get('/api/tickets/queue')).json()).data.items;
  const ticket = records.find(
    (item: { client: { id: string } }) => item.client.id === organisation.id,
  );
  const csrfToken = (await (await page.request.get('/api/auth/csrf')).json()).data.csrfToken;
  const headers = { 'X-CSRF-Token': csrfToken };
  const longName = `Fictional${'Organisation'.repeat(11)}`;
  const longTitle = `Delivery${'Request'.repeat(28)}`;
  const clientContext = await browser.newContext({
    baseURL: process.env.VERIFY_URL ?? 'https://localhost:8443',
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    expect(
      (
        await page.request.patch(`/api/clients/${organisation.id}`, {
          headers,
          data: { name: longName },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.patch(`/api/tickets/${ticket.id}`, {
          headers,
          data: { title: longTitle },
        })
      ).ok(),
    ).toBe(true);
    const clientPage = await clientContext.newPage();
    await login(clientPage, 'Client');
    await expect(clientPage.locator('header').getByTitle(longName)).toBeVisible();
    await accessible(clientPage);
    await clientPage.goto(`/tickets/${ticket.id}`);
    await expect(clientPage.getByRole('heading', { name: longTitle })).toBeVisible();
    await accessible(clientPage);
    await clientPage.getByLabel('Add comment', { exact: true }).focus();
    const focused = await clientPage.getByLabel('Add comment', { exact: true }).boundingBox();
    const header = await clientPage.locator('header').boundingBox();
    expect(focused!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    await capture(clientPage, 'long-record-mobile');
    await page.setViewportSize({ width: 1280, height: 360 });
    await page.getByRole('link', { name: 'My account', exact: true }).focus();
    await expect(page.getByRole('link', { name: 'My account', exact: true })).toBeInViewport();
    await page.getByRole('button', { name: 'Collapse navigation' }).focus();
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeInViewport();
  } finally {
    await clientContext.close();
    expect(
      (
        await page.request.patch(`/api/clients/${organisation.id}`, {
          headers,
          data: { name: organisation.name },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.patch(`/api/tickets/${ticket.id}`, {
          headers,
          data: { title: ticket.title },
        })
      ).ok(),
    ).toBe(true);
  }
});
