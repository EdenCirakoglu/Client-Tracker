import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
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
async function capturedNotice(
  page: Page,
  recipient: string,
  subject: string,
  recordId: string,
  anchor = '',
  seen = new Set<string>(),
) {
  const mailbox = process.env.WORKFLOW_MAIL_URL ?? 'http://localhost:8025';
  if (!['localhost', '127.0.0.1'].includes(new URL(mailbox).hostname))
    throw new Error('Workflow verification only permits local captured mail.');
  let destination = '';
  await expect
    .poll(
      async () => {
        const inbox = await (await page.request.get(`${mailbox}/api/v1/messages`)).json();
        for (const item of inbox.messages.slice(0, 50)) {
          if (
            seen.has(item.ID) ||
            item.Subject !== subject ||
            !item.To.some((to: { Address: string }) => to.Address === recipient)
          )
            continue;
          const message = await (
            await page.request.get(`${mailbox}/api/v1/message/${item.ID}`)
          ).json();
          const link = (message.Text as string)
            .match(/https?:\/\/[^\s]+/g)
            ?.find((url) => url.includes(recordId) && (!anchor || url.endsWith(`#${anchor}`)));
          if (link) {
            expect(message.Text).not.toContain('#token=');
            expect(message.Text).not.toContain('Archived dispatch lookup');
            destination = link;
            seen.add(item.ID);
            return true;
          }
        }
        return false;
      },
      { timeout: 20000, message: 'Expected a generic portal notice in local Mailpit' },
    )
    .toBe(true);
  return destination;
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
    await expect(admin.getByRole('heading', { name: 'Installation setup' })).toBeVisible();
    const checklist = admin.getByRole('region', { name: 'Installation setup' });
    if ((await checklist.locator('details').getAttribute('open')) === null)
      await checklist.getByText('Setup checklist', { exact: true }).click();
    await expect(
      checklist.getByRole('link', { name: /Add client organisation details/ }),
    ).toBeVisible();
    await accessible(admin);
    await capture(admin, 'admin-onboarding');
    await login(client, 'Client');
    await expect(client.getByRole('heading', { name: 'Installation setup' })).toHaveCount(0);
    const contact = (await (await client.request.get('/api/auth/me')).json()).data;
    await mutation(
      client,
      '/api/auth/notification-preferences',
      { workflowNotifications: true },
      'PATCH',
    );
    await capture(client, 'client-dashboard');
    await login(staff, 'Developer');
    await expect(staff.getByRole('heading', { name: 'Installation setup' })).toHaveCount(0);
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
      '1 newly queued, 0 already requested, 0 not queued',
    );
    await capturedNotice(
      client,
      'client@example.com',
      'ClientOps: a progress update is available',
      summary.id,
    );
    await capture(staff, 'summary-notification-outcome');
    await staff.getByLabel('Northstar Demo Contact', { exact: true }).check();
    await staff.getByRole('button', { name: 'Notify selected contacts', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Summary update' })).toContainText(
      '0 newly queued, 1 already requested, 0 not queued',
    );
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

test('captured workflow emails retain the record and section through sign-in without granting access', async ({
  browser,
}) => {
  const baseURL = process.env.VERIFY_URL ?? 'https://localhost:8443';
  const staffContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const clientContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const staff = await staffContext.newPage(),
    client = await clientContext.newPage();
  try {
    await login(staff, 'Developer');
    await login(client, 'Client');
    const target = new URL(baseURL);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !['8443', '8460'].includes(target.port)
    )
      throw new Error(
        'Email navigation requires the named hardening or launch disposable fixture.',
      );
    // This independent scenario must not inherit the prior suite's in-memory IP budget.
    // Restart only the fixture API, retaining sessions, records and database-backed limits.
    execFileSync(
      process.execPath,
      [
        'scripts/hardening-stack.mjs',
        'restart-demo-api',
        ...(target.port === '8460' ? ['--launch'] : []),
      ],
      { stdio: 'inherit' },
    );
    expect((await staff.request.get('/api/auth/me')).ok()).toBe(true);
    expect((await client.request.get('/api/auth/me')).ok()).toBe(true);
    const person = (await (await client.request.get('/api/auth/me')).json()).data;
    await mutation(
      client,
      '/api/auth/notification-preferences',
      { workflowNotifications: true },
      'PATCH',
    );
    const projects = (await (await client.request.get('/api/projects')).json()).data as {
      id: string;
    }[];
    const releases = (await (await staff.request.get('/api/releases')).json()).data as {
      id: string;
      projectId: string;
    }[];
    const project = projects.find((item) =>
      releases.some((release) => release.projectId === item.id),
    );
    expect(project).toBeTruthy();
    if (!project)
      throw new Error('The disposable fixture must have a client project with a release.');
    const release = releases.find((item) => item.projectId === project.id)!;
    const ticket = await mutation(client, '/api/tickets', {
      projectId: project.id,
      title: 'Client shipment reference review',
      description: 'Find archived shipments using the original customer reference.',
      category: 'FEATURE_REQUEST',
    });
    const seenNotices = new Set<string>();
    const notice = async (recordId: string, anchor = '', summary = false) =>
      capturedNotice(
        staff,
        person.email,
        summary
          ? 'ClientOps: a progress update is available'
          : 'ClientOps: your review is requested',
        recordId,
        anchor,
        seenNotices,
      );
    const followSignedOut = async (href: string, anchor = '') => {
      await clientContext.clearCookies();
      // A received email opens a document; a hash-only navigation would retain live React state.
      await client.goto('about:blank');
      const target = new URL(href);
      target.searchParams.set('from', 'email');
      await client.goto(target.href);
      await expect(client).toHaveURL(/\/login\?next=/);
      await client.getByRole('button', { name: 'Continue as Client', exact: true }).click();
      await expect(client).toHaveURL(target.href);
      if (anchor)
        await expect.poll(() => client.evaluate(() => document.activeElement?.id)).toBe(anchor);
    };
    const proposal = await mutation(staff, `/api/tickets/${ticket.id}/scope`, {
      expectedRevision: 0,
      approverId: person.id,
      scope: 'Search archived shipment references.',
      exclusions: 'No historical imports.',
      estimate: 'Two days, estimate only.',
      deliveryImplications: 'Review the result in the next release.',
    });
    const scopeUrl = await notice(ticket.id, 'scope');
    await followSignedOut(scopeUrl, 'scope');
    await client.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(client.getByText('Revision 1: Approved', { exact: true })).toBeVisible();
    await client.reload();
    await expect(client.getByText('Revision 1: Approved', { exact: true })).toBeVisible();
    const delivery = await mutation(staff, `/api/tickets/${ticket.id}/delivery`, {
      expectedRevision: 0,
      reviewerId: person.id,
      outcome: 'Archived shipment references return the correct record.',
    });
    const outcomeUrl = await notice(ticket.id, 'delivery');
    await followSignedOut(outcomeUrl, 'delivery');
    await client.getByRole('button', { name: 'Agree outcome', exact: true }).click();
    await expect(client.getByText('Outcome agreed', { exact: true })).toBeVisible();
    await mutation(
      staff,
      `/api/tickets/${ticket.id}/delivery/${delivery.revisions[0].id}/request-acceptance`,
      { releaseId: release.id, deliveryNotes: 'Search now includes archived shipment references.' },
    );
    const acceptanceUrl = await notice(ticket.id, 'delivery');
    // Revocation leaves the prior browser session unusable; the next email still returns here.
    await mutation(client, '/api/auth/logout', {});
    await client.goto(acceptanceUrl);
    await expect(client).toHaveURL(/\/login\?next=/);
    await client.getByRole('button', { name: 'Continue as Client', exact: true }).click();
    await expect(client).toHaveURL(acceptanceUrl);
    await client.getByRole('button', { name: 'Accept delivery', exact: true }).click();
    await client.reload();
    await expect(client.getByText('Accepted by client', { exact: true })).toBeVisible();
    const summary = await mutation(staff, '/api/summaries', {
      clientId: person.clientId,
      weekStart: new Date().toISOString().slice(0, 10),
    });
    await mutation(staff, `/api/summaries/${summary.id}/publish`, { recipientIds: [person.id] });
    await followSignedOut(await notice(summary.id, '', true));
    await expect(client.locator('main h1')).toContainText('progress update');
    await accessible(client);
    // The destination is navigation, never a capability or identity switch.
    await staff.goto(scopeUrl);
    await expect(
      staff.getByRole('button', { name: 'Record scope decision', exact: true }),
    ).toHaveCount(0);
    expect((await staff.request.get('/api/auth/me')).ok()).toBe(true);
    await client.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(client).toHaveURL(`${baseURL}/login`);
    await client.goto(scopeUrl);
    await client.getByLabel('Email', { exact: true }).fill('bluewave@example.com');
    await client.getByLabel('Password', { exact: true }).fill('password123');
    await client.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(client).toHaveURL(scopeUrl);
    await expect(client.locator('main').getByRole('alert')).toContainText('Ticket was not found');
    expect(
      await mutationStatus(client, `/api/tickets/${ticket.id}/scope/${proposal[0].id}/decision`, {
        decision: 'APPROVED',
        feedback: '',
      }),
    ).toBe(404);
    await client.goto('/tickets/00000000-0000-4000-8000-000000000000#delivery');
    await expect(client.locator('main').getByRole('alert')).toContainText('Ticket was not found');
    for (const destination of [
      '//outside.example',
      'https://outside.example',
      '/login?next=/login',
      '/tickets/%ZZ',
    ]) {
      await client.goto(`/login?next=${encodeURIComponent(destination)}`);
      await expect(client).toHaveURL(`${baseURL}/dashboard`);
    }
  } finally {
    await staffContext.close();
    await clientContext.close();
  }
});

async function mutationStatus(page: Page, path: string, data: unknown) {
  const csrf = (await (await page.request.get('/api/auth/csrf')).json()).data.csrfToken;
  return (await page.request.post(path, { data, headers: { 'X-CSRF-Token': csrf } })).status();
}
