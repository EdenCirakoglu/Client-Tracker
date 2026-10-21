import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, role: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function mutation(page: Page, path: string, data: unknown, method = 'POST') {
  const csrf = (await (await page.request.get('/api/auth/csrf')).json()).data.csrfToken;
  const response = await page.request.fetch(path, {
    method,
    data,
    headers: { 'X-CSRF-Token': csrf },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}
async function capture(page: Page, name: string) {
  const directory = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/launch-product');
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: resolve(directory, `launch-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function capturedNotice(page: Page, recipient: string, subject: string, recordId: string) {
  const mailbox = process.env.WORKFLOW_MAIL_URL ?? 'http://localhost:8025';
  if (!['localhost', '127.0.0.1'].includes(new URL(mailbox).hostname))
    throw new Error('Workflow verification only permits local captured mail.');
  await expect
    .poll(
      async () => {
        const inbox = await (await page.request.get(`${mailbox}/api/v1/messages`)).json();
        for (const item of inbox.messages.slice(0, 50)) {
          if (
            item.Subject !== subject ||
            !item.To.some((to: { Address: string }) => to.Address === recipient)
          )
            continue;
          const message = await (
            await page.request.get(`${mailbox}/api/v1/message/${item.ID}`)
          ).json();
          if (message.Text.includes(recordId)) {
            expect(message.Text).not.toContain('#token=');
            expect(message.Text).not.toContain('Archived dispatch lookup');
            return true;
          }
        }
        return false;
      },
      { timeout: 20000, message: 'Expected a generic portal notice in local Mailpit' },
    )
    .toBe(true);
}

test('administrator checklist, review notices, explicit summary delivery and preferences', async ({
  browser,
}) => {
  const baseURL = process.env.VERIFY_URL ?? 'https://localhost:8443';
  const staffContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  });
  const clientContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
  });
  const adminContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  });
  const staff = await staffContext.newPage(),
    client = await clientContext.newPage(),
    admin = await adminContext.newPage();
  try {
    await login(admin, 'Admin');
    await expect(
      admin.getByRole('heading', { name: 'Get your first client started' }),
    ).toBeVisible();
    const checklist = admin.getByRole('region', { name: 'Get your first client started' });
    if ((await checklist.locator('details').getAttribute('open')) === null)
      await checklist.getByText('Setup checklist', { exact: true }).click();
    await expect(
      checklist.getByRole('link', { name: /Add client organisation details/ }),
    ).toBeVisible();
    await accessible(admin);
    await capture(admin, 'admin-onboarding');
    await login(client, 'Client');
    await expect(
      client.getByRole('heading', { name: 'Get your first client started' }),
    ).toHaveCount(0);
    const contact = (await (await client.request.get('/api/auth/me')).json()).data;
    await mutation(
      client,
      '/api/auth/notification-preferences',
      { workflowNotifications: true },
      'PATCH',
    );
    await capture(client, 'client-dashboard');
    await login(staff, 'Developer');
    await expect(staff.getByRole('heading', { name: 'Get your first client started' })).toHaveCount(
      0,
    );
    await capture(staff, 'developer-dashboard');
    const projects = (await (await client.request.get('/api/projects')).json()).data;
    const ticket = await mutation(client, '/api/tickets', {
      projectId: projects[0].id,
      title: 'Archived dispatch lookup',
      description: 'Dispatch needs archived shipment references included in search results.',
      category: 'FEATURE_REQUEST',
    });
    await mutation(staff, `/api/tickets/${ticket.id}/scope`, {
      expectedRevision: 0,
      approverId: contact.id,
      scope: 'Include archived shipment references in search results.',
      exclusions: 'No historical imports.',
      estimate: 'Two days, estimate only.',
      deliveryImplications: 'Review the next operations delivery together.',
    });
    await capturedNotice(
      client,
      'client@example.com',
      'ClientOps: your review is requested',
      ticket.id,
    );
    await client.goto(`/tickets/${ticket.id}`);
    await client.getByLabel('Scope decision').selectOption('APPROVED');
    await client.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(client.getByText('Revision 1: Approved', { exact: true })).toBeVisible();
    await capturedNotice(
      staff,
      'developer@example.com',
      'ClientOps: a client decision has been recorded',
      ticket.id,
    );
    await mutation(staff, `/api/tickets/${ticket.id}/delivery`, {
      expectedRevision: 0,
      reviewerId: contact.id,
      outcome: 'Archived references return the correct dispatch record and status.',
    });
    await client.reload();
    await client.setViewportSize({ width: 390, height: 844 });
    await client
      .getByRole('heading', { name: 'Delivery and acceptance', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(client.getByRole('button', { name: 'Agree outcome', exact: true })).toBeVisible();
    const directory = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/launch-product');
    await mkdir(directory, { recursive: true });
    // Retain the 390 x 844 usability check above; give the complete panel room in the capture.
    await client.setViewportSize({ width: 390, height: 1100 });
    await client
      .locator('#delivery')
      .screenshot({ path: resolve(directory, 'launch-pending-decision-mobile.png') });
    await client.setViewportSize({ width: 390, height: 844 });
    await accessible(client);
    const summary = await mutation(staff, '/api/summaries', {
      clientId: contact.clientId,
      weekStart: new Date().toISOString().slice(0, 10),
    });
    await staff.goto(`/summaries/${summary.id}`);
    await staff
      .getByLabel(
        'I have reviewed the records and confirmed all notes are suitable for this client.',
      )
      .check();
    await staff.getByLabel('Northstar Demo Contact', { exact: true }).focus();
    await staff.keyboard.press('Space');
    await expect(staff.getByLabel('Northstar Demo Contact', { exact: true })).toBeChecked();
    await staff.getByRole('button', { name: 'Publish and notify contacts', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Summary update' })).toContainText(
      'Email notices queued',
    );
    await capturedNotice(
      client,
      'client@example.com',
      'ClientOps: a progress update is available',
      summary.id,
    );
    await capture(staff, 'summary-notification-outcome');
    await client.goto(`/summaries/${summary.id}`);
    await expect(
      client.getByRole('heading', { name: 'Client decisions and replies' }),
    ).toBeVisible();
    await expect(
      client.getByRole('heading', { name: 'Delivery decisions', exact: true }),
    ).toBeVisible();
    await accessible(client);
    await capture(client, 'summary-client-mobile');
    const headings = await client.locator('main h2').allTextContents();
    expect(headings.indexOf('Delivery decisions')).toBeLessThan(
      headings.indexOf('Resolved requests'),
    );
    await client.goto('/account');
    await client.getByLabel('Receive workflow emails', { exact: true }).uncheck();
    await expect(client.getByRole('status', { name: 'Email preference update' })).toContainText(
      'Workflow emails turned off',
    );
    await client.reload();
    await expect(client.getByLabel('Receive workflow emails')).not.toBeChecked();
    await accessible(client);
    await capture(client, 'notification-preference-mobile');
    await client.getByLabel('Receive workflow emails').focus();
    await client.keyboard.press('Space');
    await expect(client.getByRole('status', { name: 'Email preference update' })).toContainText(
      'Workflow emails enabled',
    );
    await admin.goto('/users');
    await expect(admin.getByText('Accepted by mail server').first()).toBeVisible();
    await capture(admin, 'notification-delivery-status');
  } finally {
    await staffContext.close();
    await clientContext.close();
    await adminContext.close();
  }
});
