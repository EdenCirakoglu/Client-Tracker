import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, role: 'Admin' | 'Developer' | 'Client') {
  await page.goto('/login');
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function capture(page: Page, name: string) {
  const directory = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/product-workflows');
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: resolve(directory, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}
async function accessible(page: Page) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(report.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('client request, versioned scope, delivery acceptance and reviewed progress summary', async ({
  browser,
}) => {
  const baseURL = process.env.VERIFY_URL ?? 'https://localhost:8443';
  const customerContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
  });
  const staffContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  });
  const customer = await customerContext.newPage();
  const staff = await staffContext.newPage();
  try {
    await login(customer, 'Client');
    await customer.goto('/tickets/new');
    await customer
      .getByLabel('Project', { exact: true })
      .selectOption({ label: 'Operations Portal' });
    await customer
      .getByLabel('Title', { exact: true })
      .fill('Archived shipment lookup for dispatch');
    await customer
      .getByLabel('Description', { exact: true })
      .fill('Dispatch staff need archived orders included when searching a shipment reference.');
    await customer.getByLabel('Category', { exact: true }).selectOption('FEATURE_REQUEST');
    await customer.getByRole('button', { name: 'Create ticket', exact: true }).click();
    await expect(customer).toHaveURL(/\/tickets\/[a-f0-9-]{36}$/);
    const ticketPath = new URL(customer.url()).pathname;
    await login(staff, 'Developer');
    await staff.goto(ticketPath);
    await staff.getByRole('button', { name: 'Propose scope change', exact: true }).click();
    await staff
      .getByLabel('Proposed scope', { exact: true })
      .fill('Search archived shipment references and display a clear archived status.');
    await staff
      .getByLabel('Excluded work')
      .fill('Bulk exports and document migration are excluded.');
    await staff
      .getByLabel('Delivery implications')
      .fill('Ready for client verification in the next operations release.');
    await staff.getByLabel('Effort estimate (not actual time)').fill('2-3 engineering days');
    await staff
      .getByLabel('External quotation or invoice reference (optional)')
      .fill('DEMO-QUOTE-104');
    await staff.getByLabel('Client approver').selectOption({ label: 'Northstar Demo Contact' });
    await staff.getByRole('button', { name: 'Request scope approval', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Scope update' })).toHaveText(
      'Proposal sent for approval.',
    );
    await customer.reload();
    await customer.getByLabel('Scope decision').selectOption('APPROVED');
    await customer.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(customer.getByText('Revision 1: Approved', { exact: true })).toBeVisible();
    await staff.reload();
    await staff.getByRole('button', { name: 'Revise scope proposal', exact: true }).click();
    await staff
      .getByLabel('Proposed scope', { exact: true })
      .fill(
        'Search archived shipment references and show archived labels, including older orders.',
      );
    await staff.getByRole('button', { name: 'Request scope approval', exact: true }).click();
    await expect(staff.getByText('Revision 2: Proposed', { exact: true })).toBeVisible();
    await customer.reload();
    await customer.getByRole('button', { name: 'Record scope decision', exact: true }).click();
    await expect(customer.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
    await staff.reload();
    await staff.getByRole('button', { name: 'Propose outcome', exact: true }).click();
    await staff
      .getByLabel('Acceptance criteria')
      .fill('A known archived shipment reference returns its order and an archived label.');
    await staff.getByLabel('Client reviewer').selectOption({ label: 'Northstar Demo Contact' });
    await staff.getByRole('button', { name: 'Request outcome agreement', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Delivery update' })).toHaveText(
      'Outcome sent for client agreement.',
    );
    await customer.reload();
    await customer.getByRole('button', { name: 'Agree outcome', exact: true }).focus();
    await customer.keyboard.press('Enter');
    await expect(customer.getByText('Outcome agreed', { exact: true })).toBeVisible();
    await staff.reload();
    await staff
      .getByLabel('Delivered in release')
      .selectOption({ label: '1.4.0 - Operations Queue Improvements' });
    await staff
      .getByLabel('Delivery notes for the client')
      .fill(
        'Archived shipment search is available in the operations release. Check a known archived reference.',
      );
    await staff.getByRole('button', { name: 'Request acceptance', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Delivery update' })).toHaveText(
      'Acceptance requested. Ticket status has not changed.',
    );
    await customer.reload();
    await accessible(customer);
    await capture(customer, 'delivery-awaiting-client');
    await customer.getByLabel('Request changes', { exact: true }).check();
    await customer
      .getByLabel('What remains unresolved?')
      .fill('The archived label is missing for last year orders.');
    await customer.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await expect(customer.getByText('Changes requested', { exact: true })).toBeVisible();
    await staff.reload();
    await staff.getByRole('button', { name: 'Propose revised outcome', exact: true }).click();
    await staff
      .getByLabel('Acceptance criteria')
      .fill(
        'Archived shipment references return their order and label, including last year orders.',
      );
    await staff.getByRole('button', { name: 'Request outcome agreement', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Delivery update' })).toHaveText(
      'Outcome sent for client agreement.',
    );
    await customer.reload();
    await customer.getByRole('button', { name: 'Agree outcome', exact: true }).click();
    await expect(customer.getByText('Outcome agreed', { exact: true })).toBeVisible();
    await staff.reload();
    await staff
      .getByLabel('Delivered in release')
      .selectOption({ label: '1.4.0 - Operations Queue Improvements' });
    await staff
      .getByLabel('Delivery notes for the client')
      .fill('The archived status is now included for last year orders as well.');
    await staff.getByRole('button', { name: 'Request acceptance', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Delivery update' })).toContainText(
      'Acceptance requested',
    );
    await customer.reload();
    await customer
      .getByLabel('Feedback (optional)', { exact: true })
      .fill('Confirmed against the archived dispatch references.');
    await customer.getByRole('button', { name: 'Accept delivery', exact: true }).click();
    await expect(customer.getByText('Accepted by client', { exact: true })).toBeVisible();
    await customer.reload();
    await expect(customer.getByText('Accepted by client', { exact: true })).toBeVisible();
    const downloadEvent = customer.waitForEvent('download');
    await customer.getByRole('button', { name: 'Export client delivery record' }).click();
    const download = await downloadEvent;
    const content = await readFile((await download.path())!, 'utf8');
    expect(content).toContain('ACCEPTED');
    expect(content).toContain('CHANGES_REQUESTED');
    expect(content).toContain('Ticket status (separate from acceptance): OPEN');
    await capture(customer, 'delivery-accepted');
    await customer.setViewportSize({ width: 390, height: 844 });
    await accessible(customer);
    await capture(customer, 'delivery-mobile');
    for (const width of [768, 1280, 1440]) {
      await customer.setViewportSize({ width, height: 900 });
      await accessible(customer);
    }
    await customer.getByLabel('Account menu', { exact: true }).click();
    await customer.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await customer.keyboard.press('Escape');
    await expect(customer.locator('html')).toHaveAttribute('data-theme', 'dark');
    await accessible(customer);
    await capture(customer, 'delivery-dark');
    await customer.getByLabel('Account menu', { exact: true }).click();
    await customer.getByRole('button', { name: 'Light theme', exact: true }).click();
    await customer.keyboard.press('Escape');
    await customer.setViewportSize({ width: 390, height: 844 });
    await staff.goto('/summaries/new');
    await staff
      .getByLabel('Client organisation')
      .selectOption({ label: 'Northstar Logistics (Demo)' });
    await staff.getByLabel('Week beginning (UTC)').fill(new Date().toISOString().slice(0, 10));
    await staff.getByRole('button', { name: 'Add commitment' }).click();
    await staff.getByLabel('Supporting ticket 1').selectOption(ticketPath.split('/').at(-1)!);
    await staff
      .getByLabel('Commitment and timing')
      .fill('Review dispatch feedback with the client at the next weekly check-in.');
    await staff.getByRole('button', { name: 'Preview summary', exact: true }).click();
    await expect(staff).toHaveURL(/\/summaries\/[a-f0-9-]{36}$/);
    await expect(staff.getByText('Draft - not visible to clients.', { exact: true })).toBeVisible();
    const summaryPath = new URL(staff.url()).pathname;
    expect((await customer.request.get(`/api${summaryPath}`)).status()).toBe(404);
    await accessible(staff);
    await capture(staff, 'summary-preview');
    await staff
      .getByLabel(
        'I have reviewed the records and confirmed all notes are suitable for this client.',
      )
      .check();
    await staff.getByRole('button', { name: 'Publish to client portal', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Summary update' })).toContainText(
      'Published to the client portal',
    );
    await customer.goto(summaryPath);
    await expect(
      customer.getByRole('heading', { name: /Northstar Logistics.*progress update/ }),
    ).toBeVisible();
    await expect(
      customer.getByText('Review dispatch feedback with the client at the next weekly check-in.'),
    ).toBeVisible();
    await expect(customer.getByRole('button', { name: 'Publish to client portal' })).toHaveCount(0);
    await accessible(customer);
    await capture(customer, 'summary-client-mobile');
  } finally {
    await customerContext.close();
    await staffContext.close();
  }
});
