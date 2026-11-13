import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signIn(page: Page, role = 'Admin') {
  await page.goto('/login');
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function settled(page: Page) {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: /Loading|Checking|Finding/ }),
  ).toHaveCount(0);
}

async function capture(page: Page, path: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
}

async function fits(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  const outside = await page
    .locator('form input:not([type="hidden"]), form select, form textarea, form button')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1);
        })
        .map((element) => element.id || element.textContent),
    );
  expect(outside).toEqual([]);
}

const failure =
  'The request could not be saved. Your entries are still available. Please retry after the service is available.';
async function fail(route: Route) {
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: failure } }),
  });
}

for (const view of [
  { width: 1440, height: 1000, theme: 'dark' },
  { width: 390, height: 844, theme: 'dark' },
  { width: 390, height: 844, theme: 'light' },
]) {
  test(`portal owned routes fit ${view.width} ${view.theme}`, async ({ page }, info) => {
    await page.setViewportSize(view);
    await signIn(page);
    await page.evaluate((theme) => localStorage.setItem('clientops:theme', theme), view.theme);
    for (const route of [
      '/clients',
      '/projects',
      '/delivery',
      '/tickets',
      '/tickets/new',
      '/releases',
      '/summaries',
      '/summaries/new',
      '/users',
      '/account',
      '/guide',
    ]) {
      await page.goto(route);
      await settled(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', view.theme);
      await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
      await fits(page);
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await capture(page, info.outputPath(`${route.slice(1).replaceAll('/', '-')}.png`));
    }
  });
}

test('personal workflow filters preserve URL history and mobile context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'Developer');
  await page.goto('/tickets?assignment=mine&workflow=waiting&order=attention');
  await settled(page);
  await expect(page.getByLabel('Active ticket filters')).toContainText('Waiting on client');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByLabel('Filter by workflow').selectOption('changes');
  await expect(page).toHaveURL(/assignment=mine&workflow=changes&order=attention/);
  await expect(page.getByLabel('Filter by status')).toHaveValue('ALL');
  await page.reload();
  await expect(page.getByLabel('Active ticket filters')).toContainText('Changes requested');
  await page.goBack();
  await expect(page.getByLabel('Active ticket filters')).toContainText('Waiting on client');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByLabel('Filter by assignment').selectOption('unassigned');
  await expect(page).toHaveURL(/assignment=unassigned&order=attention$/);
  await expect(page.getByLabel('Filter by workflow')).toHaveValue('ALL');
  await page.getByLabel('Filter by workflow').selectOption('ready');
  await expect(page.getByLabel('Filter by assignment')).toHaveValue('mine');
  await expect(page).toHaveURL(/assignment=mine&order=attention&workflow=ready$/);
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.getByLabel('Active ticket filters')).toContainText('Ready for work');
  await page.getByRole('link', { name: 'Reset filters', exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
});

test('editor create actions clear edit state and project reset preserves URL history', async ({
  page,
}) => {
  await signIn(page);
  const writes: string[] = [];
  await page.route('**/api/**', async (route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
      await route.continue();
    } else {
      writes.push(`${route.request().method()} ${route.request().url()}`);
      await route.abort();
    }
  });

  for (const entry of [
    {
      route: '/clients',
      action: 'Create client',
      heading: 'Create client',
      name: '#clients-name',
      form: '#client-form',
      submit: 'Create client',
    },
    {
      route: '/projects',
      action: 'Create project',
      heading: 'Create project',
      name: '#projects-name',
      form: '#project-form',
      submit: 'Create project',
    },
    {
      route: '/users',
      action: 'Invite account',
      heading: 'Invite a teammate or client',
      name: '#account-name',
      form: '#invite-account',
      submit: 'Send invitation',
    },
  ]) {
    await page.goto(
      entry.route === '/projects' ? '/projects?clientId=unknown-client' : entry.route,
    );
    await settled(page);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await expect(page.locator(entry.name)).not.toHaveValue('');
    if (entry.route === '/clients') {
      await page.locator('#clients-phone').fill('123456789');
    } else if (entry.route === '/projects') {
      await page.locator('#projects-description').fill('Unsaved project edit');
      await page.locator('#projects-status').selectOption('PAUSED');
    } else {
      await expect(page.locator('#account-name')).toBeDisabled();
      await page.getByLabel('Disable account', { exact: true }).check();
      await page.locator('#account-role').selectOption('CLIENT');
      await page.locator('#account-client').selectOption({ index: 1 });
    }

    await page.getByRole('link', { name: entry.action, exact: true }).click();
    await expect(page.getByRole('heading', { name: entry.heading, exact: true })).toBeVisible();
    await expect(page.locator(entry.name)).toHaveValue('');
    await expect(page.locator(entry.name)).toBeEnabled();
    await expect(page.locator(entry.name)).toBeFocused();
    expect(new URL(page.url()).hash).toBe(entry.form);
    await expect(
      page.locator(entry.form).getByRole('button', { name: entry.submit, exact: true }),
    ).toBeVisible();
    await expect(page.locator(entry.form).getByRole('button', { name: 'Cancel' })).toHaveCount(0);
    if (entry.route === '/clients') {
      await expect(page.locator('#clients-contact-email')).toHaveValue('');
      await expect(page.locator('#clients-phone')).toHaveValue('');
    } else if (entry.route === '/projects') {
      await expect(page.locator('#projects-client')).toHaveValue('');
      await expect(page.locator('#projects-description')).toHaveValue('');
      await expect(page.locator('#projects-status')).toHaveValue('ACTIVE');
    } else {
      await expect(page.locator('#account-email')).toHaveValue('');
      await expect(page.locator('#account-email')).toBeEnabled();
      await expect(page.locator('#account-role')).toHaveValue('DEVELOPER');
      await expect(page.locator('#account-client')).toHaveCount(0);
      await expect(page.getByLabel('Disable account', { exact: true })).toHaveCount(0);
    }
  }

  await page.goto('/projects');
  await settled(page);
  const clientFilter = page.getByLabel('Filter by client');
  const clientId = await clientFilter.locator('option').nth(1).getAttribute('value');
  expect(clientId).toBeTruthy();
  const query = `from=portal-regression&tag=one&tag=two`;
  const filteredUrl = `/projects?clientId=${clientId}&${query}#project-form`;
  const resetUrl = `/projects?${query}#project-form`;
  await page.goto(filteredUrl);
  await settled(page);
  await expect(clientFilter).toHaveValue(clientId!);
  await page.getByLabel('Filter by status').selectOption('PAUSED');
  await expect(page.getByRole('heading', { name: 'No projects found', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page).toHaveURL(resetUrl);
  await expect(clientFilter).toHaveValue('ALL');
  await expect(page.getByLabel('Filter by status')).toHaveValue('ALL');
  await page.goBack();
  await expect(page).toHaveURL(filteredUrl);
  await expect(clientFilter).toHaveValue(clientId!);
  await page.goForward();
  await expect(page).toHaveURL(resetUrl);
  await expect(clientFilter).toHaveValue('ALL');
  await page.reload();
  await settled(page);
  await expect(page).toHaveURL(resetUrl);
  await expect(clientFilter).toHaveValue('ALL');
  await expect(page.getByLabel('Filter by status')).toHaveValue('ALL');
  expect(writes).toEqual([]);
});

test('mobile editors retain complete errors and input without duplicate saves', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  let saves = 0;
  await page.route(
    /\/api\/(clients|projects|releases|tickets|users\/invitations)$/,
    async (route) => {
      if (route.request().method() === 'POST') {
        saves++;
        await fail(route);
      } else await route.continue();
    },
  );
  for (const entry of [
    {
      route: '/clients',
      form: '#client-form',
      name: '#clients-name',
      fields: {
        '#clients-name': 'Portal failure fixture',
        '#clients-contact-email': 'portal-fixture@example.com',
      },
      select: '',
    },
    {
      route: '/projects',
      form: '#project-form',
      name: '#projects-name',
      fields: { '#projects-name': 'Portal failure fixture' },
      select: '#projects-client',
    },
    {
      route: '/releases',
      form: '#release-form',
      name: '#releases-title',
      fields: { '#releases-title': 'Portal failure fixture', '#releases-version': 'demo-portal' },
      select: '#releases-project',
    },
    {
      route: '/tickets/new',
      form: 'form',
      name: '#new-title',
      fields: {
        '#new-title': 'Portal failure fixture',
        '#new-description': 'A fictional request used to check retained input.',
      },
      select: '#new-project',
    },
    {
      route: '/users',
      form: '#invite-account',
      name: '#account-name',
      fields: {
        '#account-name': 'Portal failure fixture',
        '#account-email': 'portal-fixture@example.com',
      },
      select: '',
    },
  ]) {
    await page.goto(entry.route);
    await settled(page);
    for (const [selector, value] of Object.entries(entry.fields))
      await page.locator(selector).fill(value);
    if (entry.select) await page.locator(entry.select).selectOption({ index: 1 });
    const before = saves;
    await page.locator(entry.form).evaluate((element) => {
      (element as HTMLFormElement).requestSubmit();
      (element as HTMLFormElement).requestSubmit();
    });
    await expect(page.getByRole('main').getByRole('alert')).toContainText(failure);
    expect(saves).toBe(before + 1);
    await expect(page.locator(entry.name)).toHaveValue('Portal failure fixture');
    await fits(page);
    await capture(page, info.outputPath(`error-${entry.route.slice(1).replaceAll('/', '-')}.png`));
  }
});

test('dependency errors retry and never report unknown project counts as zero', async ({
  page,
}) => {
  await signIn(page);
  await page.route(/\/api\/projects$/, fail, { times: 1 });
  await page.goto('/clients');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Project counts unavailable',
  );
  await expect(page.getByRole('cell', { name: 'Unavailable', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await page.route(/\/api\/clients$/, fail, { times: 1 });
  await page.goto('/summaries/new');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(failure);
  await expect(page.getByLabel('Client organisation')).toBeDisabled();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByLabel('Client organisation')).toBeEnabled();
  await page.getByLabel('Client organisation').selectOption({ index: 1 });
  await settled(page);
  await page.getByRole('button', { name: 'Add commitment', exact: true }).click();
  await page.getByLabel('Supporting ticket 1').selectOption({ index: 1 });
  await page
    .getByLabel('Commitment and timing')
    .fill('A retained client-facing commitment for next week.');
  await page.route(/\/api\/tickets\/queue\?/, fail, { times: 1 });
  await page.getByLabel('Find a ticket for commitments or blockers').fill('shipment');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(failure);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Commitment and timing')).toHaveValue(
    'A retained client-facing commitment for next week.',
  );
});

test('summary preview publishes without email and retains review after failure', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'Developer');
  await page.goto('/summaries/new');
  await settled(page);
  await page.getByLabel('Client organisation').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Preview summary', exact: true }).click();
  await expect(page).toHaveURL(/\/summaries\/[a-f0-9-]{36}$/);
  await expect(page.getByText('Draft - not visible to clients.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Client decisions and replies', exact: true }),
  ).toBeVisible();
  const publish = page.getByRole('button', { name: 'Publish to client portal', exact: true });
  await expect(publish).toBeDisabled();
  await page.getByRole('checkbox', { name: /I have reviewed/ }).check();
  await page.route(/\/api\/summaries\/[^/]+\/publish$/, fail, { times: 1 });
  await publish.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(failure);
  await expect(page.getByRole('checkbox', { name: /I have reviewed/ })).toBeChecked();
  await publish.click();
  await expect(page.getByRole('status', { name: 'Summary update' })).toHaveText(
    'Published to the client portal. No email was requested.',
  );
  await fits(page);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await capture(page, info.outputPath('published-summary-mobile.png'));
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Notify client contacts', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Notify selected contacts', exact: true }),
  ).toBeDisabled();
});

test('public account forms fit mobile and preserve validation and token removal', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/login', '/forgot-password', '/set-password', '/reset-password']) {
    await page.goto(route);
    await settled(page);
    await fits(page);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await capture(page, info.outputPath(`${route.slice(1)}.png`));
  }
  await page.goto(`/reset-password#token=${'a'.repeat(64)}`);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('New password', { exact: true }).fill('fictional-password-123');
  await page.getByLabel('Confirm password', { exact: true }).fill('mismatched-password-123');
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Passwords do not match.');
  await expect(
    page.getByRole('heading', { name: 'Check your password', exact: true }),
  ).toBeFocused();
  await page.getByLabel('Confirm password', { exact: true }).fill('fictional-password-123');
  await page.route(/\/api\/auth\/reset-password$/, fail);
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(failure);
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue(
    'fictional-password-123',
  );
});

test('client routes remain read-only where required and staff-only pages deny access', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'Client');
  for (const route of ['/projects', '/releases', '/summaries', '/guide']) {
    await page.goto(route);
    await settled(page);
    await fits(page);
    await expect(
      page.getByRole('button', { name: /Create project|Create release|Publish/ }),
    ).toHaveCount(0);
  }
  for (const route of ['/clients', '/users', '/summaries/new']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  }
  await page.goto('/tickets');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.getByLabel('Filter by workflow')).toHaveCount(0);
});
