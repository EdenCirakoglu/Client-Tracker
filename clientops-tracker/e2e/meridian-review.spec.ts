import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import type { ScopeProposal } from '../apps/web/src/lib/types';
import { approveScope } from './helpers/scope-review';

const baseURL = process.env.VERIFY_URL ?? 'https://localhost:8443';
const apiURL = process.env.VERIFY_API_URL ?? baseURL;
if (!['localhost', '127.0.0.1'].includes(new URL(apiURL).hostname))
  throw new Error('Meridian tests only use the disposable loopback API.');

async function get<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(`${apiURL}${path}`);
  expect(response.ok()).toBe(true);
  return (await response.json()).data as T;
}
async function mutate<T>(page: Page, path: string, data: unknown): Promise<T> {
  const { csrfToken } = await get<{ csrfToken: string }>(page, '/api/auth/csrf');
  const response = await page.request.post(`${apiURL}${path}`, {
    data,
    headers: { 'X-CSRF-Token': csrfToken, Origin: new URL(baseURL).origin },
  });
  expect(response.ok(), `Fixture mutation HTTP ${response.status()}`).toBe(true);
  return (await response.json()).data as T;
}
async function actor(browser: Browser, role: 'Client' | 'Developer' | 'Bluewave') {
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() => localStorage.setItem('clientops:sidebar', 'collapsed'));
  const page = await context.newPage();
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Continue as Client', exact: true })).toBeVisible();
  if (role === 'Bluewave') {
    // Native modal intro intentionally makes the form inert until its reveal completes.
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.getByLabel('Email', { exact: true }).fill('bluewave@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  } else await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return page;
}
async function fixture(client: Page, staff: Page) {
  const projects = await get<{ id: string; name: string }[]>(client, '/api/projects');
  const project = projects.find((p) => p.name === 'Operations Portal')!;
  const user = await get<{ id: string }>(client, '/api/auth/me');
  const ticket = await mutate<{ id: string }>(client, '/api/tickets', {
    projectId: project.id,
    title: 'Find active and archived shipments by customer reference',
    description:
      'Dispatch needs to find active and archived shipments by their original customer reference.',
    category: 'FEATURE_REQUEST',
  });
  const path = `/api/tickets/${ticket.id}/scope`;
  const proposal = {
    approverId: user.id,
    scope: 'Find active shipments by customer reference.',
    exclusions: 'Archived shipments are excluded from this first proposal.',
    estimate: 'One engineering day, estimate only.',
    deliveryImplications: 'Client verification follows the next Operations Portal release.',
    externalReference: 'DEMO-Q-104',
  };
  const first = await mutate<ScopeProposal[]>(staff, path, { ...proposal, expectedRevision: 0 });
  await mutate(client, `${path}/${first[0]!.id}/decision`, {
    decision: 'CHANGES_REQUESTED',
    feedback: 'Include archived shipments as well as active shipments.',
  });
  const revised = {
    ...proposal,
    scope: 'Find active and archived shipments by customer reference.',
    exclusions: 'Bulk exports and historical imports are excluded.',
    estimate: 'Two engineering days, estimate only.',
  };
  const second = await mutate<ScopeProposal[]>(staff, path, { ...revised, expectedRevision: 1 });
  return { ticket, path, revised, second: second[0]!, url: `/tickets/${ticket.id}` };
}
async function capture(page: Page, name: string) {
  const dir = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/meridian-evidence');
  await mkdir(dir, { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: resolve(dir, `meridian-${name}.png`), animations: 'disabled' });
}
async function accessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('Meridian revision navigation, semantic diff, keyboard review and persistent approval', async ({
  browser,
}) => {
  const client = await actor(browser, 'Client');
  const staff = await actor(browser, 'Developer');
  try {
    const record = await fixture(client, staff);
    await client.goto(`${record.url}?from=1&to=2&source=notice#scope`);
    const river = client.getByRole('list', { name: 'Scope revision history' });
    const current = river.getByRole('button', { name: 'Revision 2: Proposed', exact: true });
    await expect(current).toHaveAttribute('aria-current', 'step');
    await expect(client.locator('.diff-table ins').filter({ hasText: 'archived' })).toBeVisible();
    await current.focus();
    await client.keyboard.press('ArrowLeft');
    await expect(client).toHaveURL(/to=1/);
    await expect(
      client.getByRole('button', { name: 'Approve revision 2', exact: true }),
    ).toHaveCount(0);
    await client.keyboard.press('Home');
    await expect(client.getByRole('status', { name: 'Revision selection' })).toContainText(
      'original request',
    );
    await client.keyboard.press('End');
    await expect(client).toHaveURL(/to=2/);
    await river.getByRole('button', { name: 'Revision 1: Changes Requested', exact: true }).click();
    await client.goBack();
    await expect(current).toHaveAttribute('aria-pressed', 'true');
    await client.reload();
    await expect(client).toHaveURL(/source=notice/);
    await expect(current).toHaveAttribute('aria-pressed', 'true');
    await client.getByRole('slider', { name: 'Scrub scope revisions' }).focus();
    await client.keyboard.press('Home');
    await expect(client).toHaveURL(/to=0/);
    await client.keyboard.press('End');
    await expect(client).toHaveURL(/to=2/);
    const comparison = client.getByRole('region', { name: 'Revision comparison' });
    await comparison.getByRole('button', { name: 'Inline', exact: true }).click();
    await expect(comparison.locator('del').first()).toBeVisible();
    await comparison.getByLabel('Changes only', { exact: true }).uncheck();
    await expect(
      comparison.getByRole('rowheader', { name: 'Delivery implications Unchanged', exact: true }),
    ).toBeVisible();
    await comparison.getByLabel('Changes only', { exact: true }).check();
    await comparison.getByRole('button', { name: 'Side by side', exact: true }).click();
    await client.getByRole('link', { name: 'Open full comparison', exact: true }).click();
    await expect(
      client.getByRole('heading', { name: 'Compare scope revisions', exact: true }),
    ).toBeVisible();
    await expect(client).toHaveURL(/\/compare\?from=1&to=2$/);
    await client.keyboard.press('Escape');
    await expect(client).toHaveURL(new RegExp(`${record.url}\\?from=1&to=2#scope$`));
    for (const theme of ['dark', 'light']) {
      await client.evaluate((theme) => localStorage.setItem('clientops:theme', theme), theme);
      await client.reload();
      await expect(current).toBeVisible();
      for (const width of [1440, 1280, 768, 390]) {
        await client.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        await expect
          .poll(async () =>
            current.evaluate((button) => {
              const bounds = button.getBoundingClientRect();
              const viewport = button.closest('.river-scroll')!.getBoundingClientRect();
              return bounds.left >= viewport.left - 1 && bounds.right <= viewport.right + 1;
            }),
          )
          .toBe(true);
        await accessible(client);
        if (width === 1440 || width === 390) await capture(client, `client-${theme}-${width}`);
      }
    }
    await client.setViewportSize({ width: 1440, height: 1000 });
    await staff.goto(record.url);
    const staffDecision = staff.locator('#scope-decision-panel');
    await expect(staffDecision.getByText('Revision 2: Proposed', { exact: true })).toBeVisible();
    await expect(staffDecision.getByText(/Only .+ can record this decision\./)).toBeVisible();
    await expect(staff.getByRole('button', { name: /Approve revision/ })).toHaveCount(0);
    await capture(staff, 'developer-review');
    const approve = client.getByRole('button', { name: 'Approve revision 2', exact: true });
    await approve.click();
    let dialog = client.getByRole('dialog', { name: 'Approve revision 2', exact: true });
    await accessible(client);
    await client.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(approve).toBeFocused();
    await approve.click();
    dialog = client.getByRole('dialog', { name: 'Approve revision 2', exact: true });
    await dialog.getByRole('button', { name: 'Keep reviewing', exact: true }).focus();
    await client.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close review' })).toBeFocused();
    const submit = dialog.getByRole('button', { name: 'Record scope decision', exact: true });
    await expect(submit).toBeDisabled();
    await dialog.getByRole('checkbox').check();
    await capture(client, 'scope-confirmation');
    let posts = 0;
    client.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith(`/${record.second.id}/decision`))
        posts += 1;
    });
    await submit.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await expect(dialog).toHaveCount(0);
    await expect(client.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
    expect(posts).toBe(1);
    await client.emulateMedia({ reducedMotion: 'no-preference' });
    for (const theme of ['light', 'dark']) {
      await client.evaluate((value) => localStorage.setItem('clientops:theme', value), theme);
      await client.reload();
      await expect(client.locator('.decision-receipt')).toBeVisible();
      await accessible(client);
    }
    await client.reload();
    await expect(client.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
    const ticket = await get<{ status: string }>(client, `/api/tickets/${record.ticket.id}`);
    expect(ticket.status).toBe('OPEN');
    await client.getByRole('button', { name: 'Logout', exact: true }).click();
    await client.getByRole('button', { name: 'Continue as Client', exact: true }).click();
    await expect(client).toHaveURL(/dashboard$/);
    await client.goto(record.url);
    await expect(client.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
    await capture(client, 'scope-approved');
    await staff.goto(record.url);
    await expect(staff.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
    await expect(staff.getByRole('button', { name: /Approve revision/ })).toHaveCount(0);
  } finally {
    await client.context().close();
    await staff.context().close();
  }
});

test('Meridian rejects stale approval, preserves feedback on failure and records requested changes', async ({
  browser,
}) => {
  const client = await actor(browser, 'Client');
  const staff = await actor(browser, 'Developer');
  try {
    const record = await fixture(client, staff);
    await client.goto(record.url);
    await client.getByRole('button', { name: 'Approve revision 2', exact: true }).click();
    const dialog = client.getByRole('dialog', { name: 'Approve revision 2', exact: true });
    await dialog.getByRole('checkbox').check();
    const third = await mutate<ScopeProposal[]>(staff, record.path, {
      ...record.revised,
      expectedRevision: 2,
      estimate: 'Three engineering days, estimate only.',
    });
    await dialog.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('latest scope revision');
    expect((await get<ScopeProposal[]>(client, record.path))[0]!.state).toBe('PROPOSED');
    await dialog.getByRole('button', { name: 'Reload latest revision', exact: true }).click();
    await expect(client.getByText('Revision 3: Proposed', { exact: true })).toBeVisible();
    await client.getByRole('button', { name: 'Request scope changes', exact: true }).click();
    const changes = client.getByRole('dialog', { name: 'Request scope changes', exact: true });
    await changes.getByLabel('Reason for your decision').fill('Too short');
    await changes.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(changes.getByLabel('Reason for your decision')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await changes
      .getByLabel('Reason for your decision')
      .fill('Please keep the earlier two-day estimate and clarify the extra work.');
    await client.route(
      `**/api/tickets/${record.ticket.id}/scope/${third[0]!.id}/decision`,
      (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message: 'Temporarily unavailable. Please try again.',
            },
          }),
        }),
      { times: 1 },
    );
    await changes.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(changes.getByRole('alert')).toContainText('Temporarily unavailable');
    await expect(changes.getByLabel('Reason for your decision')).toHaveValue(
      'Please keep the earlier two-day estimate and clarify the extra work.',
    );
    await changes.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(changes).toHaveCount(0);
    await client.reload();
    await expect(client.getByText('Revision 3: Changes Requested', { exact: true })).toBeVisible();
    const stored = await get<ScopeProposal[]>(client, record.path);
    expect(stored.find((p) => p.revision === 2)!.state).toBe('PROPOSED');
    expect(stored.find((p) => p.revision === 1)!.state).toBe('CHANGES_REQUESTED');
    await capture(client, 'scope-changes-requested');
    // A new revision still needs its own explicit agreement.
    await mutate(staff, record.path, { ...record.revised, expectedRevision: 3 });
    await client.reload();
    await approveScope(client, 4);
    expect((await get<ScopeProposal[]>(client, record.path))[0]!.state).toBe('APPROVED');
  } finally {
    await client.context().close();
    await staff.context().close();
  }
});

test('Meridian direct comparisons never grant cross-organisation access', async ({ browser }) => {
  const client = await actor(browser, 'Client');
  const staff = await actor(browser, 'Developer');
  const other = await actor(browser, 'Bluewave');
  try {
    const record = await fixture(client, staff);
    await other.goto(`${record.url}?from=1&to=2#scope`);
    await expect(other.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    await expect(other.getByRole('heading', { name: /Find active and archived/ })).toHaveCount(0);
    await expect(other.getByRole('button', { name: /Approve revision/ })).toHaveCount(0);
    const denied = await other.request.get(`${apiURL}${record.path}`);
    expect([403, 404]).toContain(denied.status());
    expect(await denied.text()).not.toContain(record.revised.scope);
  } finally {
    await client.context().close();
    await staff.context().close();
    await other.context().close();
  }
});
