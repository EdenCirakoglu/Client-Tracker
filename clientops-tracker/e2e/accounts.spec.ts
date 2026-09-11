import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const origin = process.env.ACCOUNT_SETUP_URL ?? 'https://localhost:8444';
const mail = process.env.ACCOUNT_MAIL_URL ?? 'http://localhost:8026';
for (const url of [origin, mail])
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
    throw new Error('Account journeys only run against local capture fixtures.');
test.use({ baseURL: origin });
async function accessible(page: Page, name: string) {
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await test
    .info()
    .attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
}
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Tickets by status', { exact: true })).toBeVisible();
}
async function emailLink(page: Page, email: string, reset = false) {
  let link = '';
  await expect
    .poll(async () => {
      const response = await page.request.get(`${mail}/api/v1/messages`);
      const inbox = (await response.json()) as {
        messages: { ID: string; Subject: string; To: { Address: string }[] }[];
      };
      const message = inbox.messages.find(
        (item) =>
          item.Subject.includes(reset ? 'Reset' : 'invitation') &&
          item.To.some((recipient) => recipient.Address === email),
      );
      if (!message) return false;
      const detail = await (await page.request.get(`${mail}/api/v1/message/${message.ID}`)).json();
      link =
        ((detail.Text as string).match(/https:\/\/[^\s]+/g) ?? []).find((value) => {
          const url = new URL(value);
          return (
            url.origin === origin &&
            /^\/(set|reset)-password$/.test(url.pathname) &&
            /^#token=[a-f0-9]{64}$/.test(url.hash)
          );
        }) ?? '';
      return !!link;
    })
    .toBe(true);
  return link;
}

test('bootstrap administrator invites a client; initial setup, HTTPS session, recovery and logout', async ({
  page,
  context,
}) => {
  const address = `invited-${Date.now()}@accounts.example`;
  const organisation = `Fictional Delivery ${Date.now()}`;
  const password = 'Local-invited-passphrase-42';
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Continue as/ })).toHaveCount(0);
  await login(page, 'owner@accounts.example', 'Local-owner-passphrase-42');
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === '__Host-clientops.sid');
  expect(sessionCookie).toMatchObject({ secure: true, httpOnly: true, sameSite: 'Lax', path: '/' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('clientops.sid');
  expect(await page.evaluate(() => localStorage.getItem('clientops_token'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Accounts', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Clients', exact: true }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await page.getByLabel('Name', { exact: true }).fill(organisation);
  await page.getByLabel('Contact email', { exact: true }).fill('team@delivery.example');
  await page.getByRole('button', { name: 'Create client', exact: true }).click();
  await expect(page.getByRole('cell', { name: organisation, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Accounts', exact: true }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Workspace accounts' }).getByRole('table'),
  ).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Fictional Client Contact');
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page.getByLabel('Role', { exact: true }).selectOption('CLIENT');
  await page.getByLabel('Organisation', { exact: true }).selectOption({ label: organisation });
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Fictional Client Contact');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invitation sent.');
  const resend = page.getByRole('button', { name: 'Resend', exact: true }).first();
  await expect(resend).toBeVisible();
  expect(
    await resend.evaluate((element) => {
      const text = document.createRange();
      text.selectNodeContents(element);
      return (
        text.getBoundingClientRect().height <= parseFloat(getComputedStyle(element).lineHeight) + 1
      );
    }),
  ).toBe(true);
  await accessible(page, 'admin-invitations');
  const invitation = await emailLink(page, address);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(invitation);
  await expect(page).toHaveURL(/\/set-password$/);
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await accessible(page, 'invitation-setup');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Account ready');
  await page.goto(invitation);
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'expired or has already been used',
  );
  await accessible(page, 'used-invitation');
  await login(page, address, password);
  await expect(page.getByRole('link', { name: 'Accounts', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Clients', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const resetTab = await context.newPage();
  await resetTab.goto('/forgot-password');
  await resetTab.getByLabel('Email', { exact: true }).fill(address);
  await resetTab.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await expect(resetTab.getByRole('status')).toContainText('If this account can sign in');
  await accessible(resetTab, 'recovery-request');
  const reset = await emailLink(resetTab, address, true);
  await resetTab.goto(reset);
  await resetTab.getByLabel('New password', { exact: true }).fill(`${password}-new`);
  await resetTab.getByLabel('Confirm password', { exact: true }).fill(`${password}-new`);
  await resetTab.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(resetTab.getByRole('status')).toContainText('All previous sessions have ended');
  await accessible(resetTab, 'recovery-complete');
  await page.getByRole('link', { name: 'Tickets', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toContainText('Your session has ended');
  await resetTab.close();
  await login(page, address, `${password}-new`);
  const csrf = (await (await page.request.get('/api/auth/csrf')).json()).data.csrfToken;
  const cookie = (await context.cookies()).find((item) => item.name === '__Host-clientops.sid')!;
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const replay = await page.request.get('/api/auth/me', {
    headers: { Cookie: `${cookie.name}=${cookie.value}`, 'X-CSRF-Token': csrf },
  });
  expect(replay.status()).toBe(401);
});

test('password change requires confirmation and ends existing sessions', async ({ page }) => {
  // Independent account avoids changing the shared bootstrap owner's credential.
  const email = `password-change-${Date.now()}@accounts.example`;
  const password = 'Local-change-passphrase-42';
  await login(page, 'owner@accounts.example', 'Local-owner-passphrase-42');
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Fictional Developer');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invitation sent.');
  const invitation = await emailLink(page, email);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(invitation);
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Account ready');
  await login(page, email, password);
  await page.getByRole('link', { name: 'My account', exact: true }).click();
  await page.getByLabel('Current password', { exact: true }).fill(password);
  await page.getByLabel('New password', { exact: true }).fill(`${password}-new`);
  await page.getByLabel('Confirm password', { exact: true }).fill('Not-the-same-password');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Passwords do not match.');
  await page.getByLabel('Confirm password', { exact: true }).fill(`${password}-new`);
  await accessible(page, 'account-password');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Password changed');
  await page.getByRole('link', { name: 'Back to sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, email, `${password}-new`);
});
