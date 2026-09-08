import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const screenshotDir = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'docs/assets/screenshots');

async function capture(page: Page, name: string) {
  await mkdir(screenshotDir, { recursive: true });
  // Full-page captures must start at the document origin so sticky chrome isn't stitched mid-page.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: resolve(screenshotDir, `${name}.png`),
    fullPage: name !== 'mobile-navigation',
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

async function login(page: Page, role: 'Admin' | 'Developer' | 'Client') {
  await page.goto('/login');
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Tickets by status', { exact: true })).toBeVisible();
}

test('real administrator, developer and client workflows with persisted advisory triage', async ({
  page,
  request,
}) => {
  const scriptErrors: string[] = [];
  page.on('pageerror', (error) => scriptErrors.push(error.message));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await capture(page, 'login');
  await accessible(page);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  // Demo actions supply their own password after a failed manual sign-in.
  await login(page, 'Admin');
  await expect(page.getByText('Developer workload', { exact: true })).toBeVisible();
  await capture(page, 'admin-dashboard');
  await accessible(page);
  for (const [route, heading] of [
    ['clients', 'Client directory'],
    ['projects', 'Project portfolio'],
    ['releases', 'Release history'],
  ] as const) {
    await page.getByRole('link', { name: new RegExp(`^${route}$`, 'i') }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(
      page.getByText(/Phase 3 Test|Phase 3 Project|Manual triage generation test/),
    ).toHaveCount(0);
    await capture(page, route);
    await accessible(page);
  }
  await page.getByRole('link', { name: 'Tickets', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await capture(page, 'tickets-list');
  await accessible(page);
  for (const [label, value] of [
    ['Filter by status', 'OPEN'],
    ['Filter by priority', 'CRITICAL'],
    ['Filter by category', 'SECURITY'],
  ] as const) {
    const filter = page.getByRole('combobox', { name: label });
    await filter.selectOption(value);
    await expect(page.getByRole('table')).toBeVisible();
    await filter.selectOption('ALL');
  }
  await page.getByRole('textbox', { name: 'Search tickets' }).fill('no-matching-ticket-483921');
  await expect(page.getByRole('heading', { name: 'No tickets found' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search tickets' }).fill('');
  await page.getByRole('link', { name: 'Create ticket', exact: true }).click();
  await expect(page.getByLabel('Project', { exact: true }).locator('option')).not.toHaveCount(1);
  await accessible(page);
  await page.getByLabel('Project', { exact: true }).selectOption({ label: 'Operations Portal' });
  await page.getByLabel('Title', { exact: true }).fill('Dispatch dashboard loading delays');
  await page
    .getByLabel('Description', { exact: true })
    .fill(
      'The dispatch dashboard is slow during the morning handover. Loading takes thirty seconds.',
    );
  await page.getByLabel('Category', { exact: true }).selectOption('SUPPORT');
  await page.getByLabel('Priority', { exact: true }).selectOption('LOW');
  await page.getByRole('button', { name: 'Create ticket', exact: true }).click();
  await expect(page).toHaveURL(/\/tickets\/[a-f0-9-]{36}$/);
  const ticketURL = page.url();
  const ticketId = ticketURL.split('/').at(-1)!;
  await expect(page.getByText('Pending review', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Pending review', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('SUPPORT');
  await capture(page, 'triage-pending');
  await accessible(page);
  await page.getByRole('button', { name: 'Apply suggestion', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('PERFORMANCE');
  await expect(page.getByText('Triage Suggestion Applied', { exact: true })).toHaveCount(1);
  const token = await page.evaluate(() => localStorage.getItem('clientops_token'));
  const headers = { Authorization: `Bearer ${token}` };
  await request.patch(`/api/tickets/${ticketId}/apply-triage-suggestion`, { headers });
  const persisted = await request.get(`/api/tickets/${ticketId}`, { headers });
  expect(
    (await persisted.json()).data.events.filter(
      (event: { eventType: string }) => event.eventType === 'TRIAGE_SUGGESTION_APPLIED',
    ),
  ).toHaveLength(1);
  await capture(page, 'triage-applied');
  await page
    .getByLabel('Add comment', { exact: true })
    .fill('Investigating the dispatch query plan with the delivery team.');
  await page.getByLabel('Internal comment', { exact: true }).check();
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(
    page.getByText('Investigating the dispatch query plan with the delivery team.', {
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, 'ticket-detail');
  await test.step('ticket header stays at the viewport top while scrolling', async () => {
    for (const y of [0, 300, 700]) {
      await page.evaluate((offset) => window.scrollTo(0, offset), y);
      await expect
        .poll(() => page.locator('header').evaluate((el) => el.getBoundingClientRect().top))
        .toBe(0);
      await test.info().attach(`ticket-scroll-${y}`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
    await page.getByLabel('Status', { exact: true }).scrollIntoViewIfNeeded();
    expect(
      await page.getByLabel('Status', { exact: true }).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === el;
      }),
    ).toBe(true);
  });
  await page.getByRole('button', { name: 'Logout', exact: true }).click();

  await login(page, 'Developer');
  await capture(page, 'developer-dashboard');
  await page.getByRole('link', { name: 'Clients', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create client', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await accessible(page);
  await page.goto(ticketURL);
  await expect(page.getByLabel('Status', { exact: true })).toBeVisible();
  await test.step('dropdowns report saving, success and failure and survive refresh', async () => {
    let releaseRequest!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const endpoint = `**/api/tickets/${ticketId}`;
    await page.route(endpoint, async (route) => {
      if (route.request().method() === 'PATCH') await gate;
      await route.continue();
    });
    try {
      await page.getByLabel('Status', { exact: true }).selectOption('IN_PROGRESS');
      await expect(page.getByRole('status')).toHaveText('Saving changes...');
      await expect(page.getByLabel('Status', { exact: true })).toBeDisabled();
    } finally {
      releaseRequest();
    }
    await expect(page.getByRole('status')).toHaveText('Changes saved.');
    await page.unroute(endpoint);
    for (const [label, value] of [
      ['Priority', 'HIGH'],
      ['Category', 'BUG'],
    ] as const) {
      await page.getByLabel(label, { exact: true }).selectOption(value);
      await expect(page.getByRole('status')).toHaveText('Changes saved.');
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    }
    await capture(page, 'ticket-update-saved');
    await page.reload();
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('IN_PROGRESS');
    await expect(page.getByLabel('Priority', { exact: true })).toHaveValue('HIGH');
    await expect(page.getByLabel('Category', { exact: true })).toHaveValue('BUG');
    // Fault injection only: successful mutations above use the real API and database.
    await page.route(endpoint, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      await route.fulfill({
        status: 503,
        json: {
          error: {
            code: 'UNAVAILABLE',
            message: 'Service temporarily unavailable. Please try again.',
          },
        },
      });
    });
    await page.getByLabel('Priority', { exact: true }).selectOption('LOW');
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Changes were not saved.',
    );
    await expect(page.getByLabel('Priority', { exact: true })).toHaveValue('HIGH');
    await capture(page, 'ticket-update-error');
    await accessible(page);
    await page.unroute(endpoint);
    await page.reload();
    await expect(page.getByLabel('Priority', { exact: true })).toHaveValue('HIGH');
  });
  await page.getByRole('button', { name: 'Logout', exact: true }).click();

  await login(page, 'Client');
  await expect(page.getByText('Developer workload', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Clients', exact: true })).toHaveCount(0);
  await capture(page, 'client-dashboard');
  await accessible(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Patient Reporting Suite', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create project', exact: true })).toHaveCount(0);
  await capture(page, 'client-projects');
  await page.getByRole('link', { name: 'Releases', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Reporting Performance Update', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create release', exact: true })).toHaveCount(0);
  await capture(page, 'client-releases');
  await page.goto('/tickets/new');
  await expect(page.getByLabel('Project', { exact: true }).locator('option')).toHaveCount(3);
  await expect(page.getByLabel('Project', { exact: true }).locator('option')).not.toContainText([
    'Patient Reporting Suite',
  ]);
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: /access denied/i })).toBeVisible();
  await page.goto(ticketURL);
  await expect(
    page.getByRole('heading', { name: 'Dispatch dashboard loading delays' }),
  ).toBeVisible();
  await expect(page.getByText('Assisted triage', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('Investigating the dispatch query plan with the delivery team.', {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Status', { exact: true })).toHaveCount(0);
  await page
    .getByLabel('Add comment', { exact: true })
    .fill('The handover is complete. We can share timings from tomorrow morning.');
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(
    page.getByText('The handover is complete. We can share timings from tomorrow morning.', {
      exact: true,
    }),
  ).toBeVisible();
  await accessible(page);
  await capture(page, 'client-ticket');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByText('Tickets by status', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Tickets', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await accessible(page);
  await capture(page, 'mobile-tickets');
  await test.step('mobile tickets expose status and priority and scroll with a keyboard', async () => {
    const region = page.getByRole('region', { name: 'Records table' });
    const summary = page.getByLabel('Ticket status and priority').first();
    await expect(summary).toBeInViewport();
    await expect(summary).toContainText('In Progress');
    await expect(summary).toContainText('High');
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await region.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(page.getByRole('columnheader', { name: 'Created', exact: true })).toBeInViewport();
    await capture(page, 'mobile-tickets-scrolled');
    await region.evaluate((el) => {
      el.scrollLeft = 0;
    });
  });
  await page.goto('/dashboard');
  await expect(page.getByText('Tickets by status', { exact: true })).toBeVisible();
  await accessible(page);
  await capture(page, 'mobile-dashboard');
  expect(scriptErrors).toEqual([]);
});

test('Swagger resolves through the same Nginx origin', async ({ page }) => {
  await page.goto('/api/docs/');
  await expect(page.getByRole('heading', { name: /ClientOps Tracker API/ })).toBeVisible();
  await capture(page, 'swagger');
});

test('mobile navigation supports keyboard entry, containment and dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'Client');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await capture(page, 'mobile-navigation');
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document.querySelector('#navigation')?.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
});

test('invalid sessions redirect to login and logout propagates to another tab', async ({
  page,
  context,
}) => {
  await login(page, 'Admin');
  await page.evaluate(() => localStorage.setItem('clientops_token', 'invalid-token'));
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('clientops_token'))).toBeNull();
  await login(page, 'Client');
  const secondTab = await context.newPage();
  await secondTab.goto('/dashboard');
  await expect(secondTab.getByText('Tickets by status', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(secondTab).toHaveURL(/\/login$/);
  await secondTab.close();
});
