import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, role: 'Admin' | 'Developer' | 'Client') {
  await page.goto('/login');
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function capture(page: Page, name: string, selector?: string) {
  const directory = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/delivery-planning');
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  if (selector) {
    await page
      .locator(selector)
      .screenshot({ path: resolve(directory, `${name}.png`), animations: 'disabled' });
    return;
  }
  await page.screenshot({
    path: resolve(directory, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
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
async function settledDashboard(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Delivery follow-up', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Loading (delivery|releases|activity|queue|overview)/)).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: /^Past agreed target/ })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Loading/ })).toHaveCount(0);
}

test('dated delivery agreement, factual dashboard, project links and mobile decisions', async ({
  browser,
}) => {
  const options = {
    baseURL: process.env.VERIFY_URL ?? 'https://localhost:8443',
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  };
  const staffContext = await browser.newContext(options);
  const customerContext = await browser.newContext(options);
  const adminContext = await browser.newContext(options);
  const staff = await staffContext.newPage(),
    customer = await customerContext.newPage(),
    admin = await adminContext.newPage();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  try {
    await login(staff, 'Developer');
    await login(customer, 'Client');
    let targetPath = '';
    for (const [title, target, agree] of [
      ['Archived delivery address correction', yesterday, true],
      ['Acknowledgement receipts for dispatch', today, true],
      ['Carrier reference visibility', today, false],
    ] as const) {
      await customer.goto('/tickets/new');
      await customer
        .getByLabel('Project', { exact: true })
        .selectOption({ label: 'Operations Portal' });
      await customer.getByLabel('Title', { exact: true }).fill(title);
      await customer
        .getByLabel('Description', { exact: true })
        .fill('Dispatch staff need a clear, verifiable record alongside the shipment reference.');
      await customer.getByLabel('Category', { exact: true }).selectOption('FEATURE_REQUEST');
      await customer.getByRole('button', { name: 'Create ticket', exact: true }).click();
      await expect(customer).toHaveURL(/\/tickets\/[a-f0-9-]{36}$/);
      const path = new URL(customer.url()).pathname;
      await staff.goto(path);
      await staff.getByRole('button', { name: 'Propose outcome', exact: true }).click();
      await staff
        .getByLabel('Acceptance criteria')
        .fill(
          'A known shipment reference shows the agreed delivery information and can be checked by dispatch.',
        );
      await staff.getByLabel('Client reviewer').selectOption({ label: 'Northstar Demo Contact' });
      await staff
        .getByLabel('Delivery owner', { exact: true })
        .selectOption({ label: 'Demo Developer' });
      await staff.getByLabel('Target date (optional, UTC)').fill(target);
      if (!agree) {
        await accessible(staff);
        await capture(staff, 'outcome-with-owner-and-date', '#delivery');
      }
      await staff.getByRole('button', { name: 'Request outcome agreement', exact: true }).click();
      await expect(staff.getByRole('status', { name: 'Delivery update' })).toHaveText(
        'Outcome sent for client agreement.',
      );
      if (agree) {
        await customer.reload();
        await expect(
          customer.getByText(`Proposed target (UTC): ${target}`, { exact: true }),
        ).toBeVisible();
        await customer.getByRole('button', { name: 'Agree outcome', exact: true }).focus();
        await customer.keyboard.press('Enter');
        await expect(customer.getByText('Outcome agreed', { exact: true })).toBeVisible();
      } else targetPath = path;
    }
    await login(admin, 'Admin');
    await settledDashboard(admin);
    await capture(admin, 'admin-dashboard');
    const overdue = admin.getByRole('link', { name: /^Past agreed target/ });
    const expected = Number((await overdue.innerText()).match(/\d+$/)?.[0]);
    expect(expected).toBeGreaterThan(0);
    await overdue.click();
    await expect(admin).toHaveURL(/\/delivery\?view=overdue$/);
    await expect(
      admin.getByRole('heading', { name: `Past agreed target (${expected})`, exact: true }),
    ).toBeVisible();
    await expect(admin.getByText('Agreed target date has passed').first()).toBeVisible();
    await admin.getByLabel('Show', { exact: true }).selectOption('agreement');
    await admin.getByLabel('Project', { exact: true }).selectOption({ label: 'Operations Portal' });
    await expect(admin).toHaveURL(/view=agreement&projectId=/);
    await expect(
      admin
        .getByRole('link', { name: 'Carrier reference visibility', exact: true })
        .and(admin.locator(`[href="${targetPath}#delivery"]`)),
    ).toBeVisible();
    await admin.goBack();
    await expect(admin.getByLabel('Show', { exact: true })).toHaveValue('agreement');
    await expect(admin.getByLabel('Project', { exact: true })).toHaveValue('');
    await admin.getByRole('link', { name: 'Reset filters', exact: true }).click();
    await expect(admin.getByLabel('Show', { exact: true })).toHaveValue('followup');
    await expect(admin.getByRole('heading', { name: /Delivery follow-up \(\d+\)/ })).toBeVisible();
    await accessible(admin);
    await capture(admin, 'delivery-plan-desktop');
    await admin.goto('/projects');
    await admin.getByRole('link', { name: 'Operations Portal', exact: true }).click();
    await expect(admin).toHaveURL(/\/delivery\?projectId=/);
    await expect(admin.getByLabel('Project', { exact: true }).locator('option:checked')).toHaveText(
      'Operations Portal',
    );
    await staff.goto('/dashboard');
    await settledDashboard(staff);
    await capture(staff, 'developer-dashboard');
    await customer.goto('/dashboard');
    await settledDashboard(customer);
    await expect(customer.getByRole('heading', { name: 'Developer workload' })).toHaveCount(0);
    await capture(customer, 'client-dashboard');
    await customer.goto('/delivery?view=agreement');
    await expect(
      customer
        .getByRole('link', {
          name: 'Review decision: Carrier reference visibility',
          exact: true,
        })
        .and(customer.locator(`[href="${targetPath}#delivery"]`)),
    ).toBeVisible();
    await customer.setViewportSize({ width: 390, height: 844 });
    await accessible(customer);
    await capture(customer, 'client-plan-mobile');
    await customer
      .getByRole('link', { name: 'Review decision: Carrier reference visibility', exact: true })
      .and(customer.locator(`[href="${targetPath}#delivery"]`))
      .click();
    await expect(customer).toHaveURL(`${options.baseURL}${targetPath}#delivery`);
    await expect(
      customer.getByRole('heading', { name: 'Delivery and acceptance', exact: true }),
    ).toBeInViewport();
    await expect(
      customer.getByRole('button', { name: 'Agree outcome', exact: true }),
    ).toBeVisible();
    await accessible(customer);
    await capture(customer, 'client-decision-mobile', '#delivery');
    await staff.goto(targetPath);
    await staff.getByRole('button', { name: 'Propose revised outcome', exact: true }).click();
    await staff.getByLabel('Target date (optional, UTC)').fill(yesterday);
    await staff.getByRole('button', { name: 'Request outcome agreement', exact: true }).click();
    await expect(staff.getByRole('status', { name: 'Delivery update' })).toContainText(
      'Outcome sent',
    );
    await customer.reload();
    await expect(customer.getByText('Revision 2', { exact: true })).toBeVisible();
    await expect(
      customer.getByText(`Proposed target (UTC): ${yesterday}`, { exact: true }),
    ).toBeVisible();
    await customer.goto('/delivery?view=agreement');
    for (const width of [768, 1280, 1440]) {
      await expect(
        customer
          .getByRole('link', { name: 'Carrier reference visibility', exact: true })
          .and(customer.locator(`[href="${targetPath}#delivery"]`)),
      ).toBeVisible();
      await customer.setViewportSize({ width, height: 900 });
      await accessible(customer);
    }
    await customer.getByLabel('Account menu', { exact: true }).click();
    await customer.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await customer.keyboard.press('Escape');
    await expect(customer.locator('html')).toHaveAttribute('data-theme', 'dark');
    await accessible(customer);
    await capture(customer, 'delivery-plan-dark');
    await customer.route('**/api/dashboard/delivery?*', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAVAILABLE', message: 'Delivery plan is temporarily unavailable.' },
        }),
      }),
    );
    await customer.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(
      customer.getByText('Delivery plan is temporarily unavailable.', { exact: true }),
    ).toBeVisible();
    await expect(customer.getByText('No matching delivery records', { exact: true })).toHaveCount(
      0,
    );
    await customer.unroute('**/api/dashboard/delivery?*');
    await customer.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      customer
        .getByRole('link', { name: 'Carrier reference visibility', exact: true })
        .and(customer.locator(`[href="${targetPath}#delivery"]`)),
    ).toBeVisible();
  } finally {
    await staffContext.close();
    await customerContext.close();
    await adminContext.close();
  }
});
