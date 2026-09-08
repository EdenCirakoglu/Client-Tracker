import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const screenshotDir = resolve('docs/assets/screenshots');

async function capture(page: Page, name: string) {
  await mkdir(screenshotDir, { recursive: true });
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
  await page.getByLabel('Status', { exact: true }).selectOption('IN_PROGRESS');
  await expect(page.getByLabel('Status', { exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('IN_PROGRESS');
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
