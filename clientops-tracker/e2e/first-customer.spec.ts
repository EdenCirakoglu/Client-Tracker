import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const origin = process.env.ACCOUNT_SETUP_URL ?? 'https://localhost:8444';
const mailbox = process.env.ACCOUNT_MAIL_URL ?? 'http://localhost:8026';
for (const url of [origin, mailbox]) {
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
    throw new Error('Local fictional capture fixtures only.');
}
const password = 'Fictional-customer-passphrase-42';
async function signIn(page: Page, email: string, pass = password) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function write(page: Page, path: string, data: unknown, method = 'POST') {
  const csrf = (await (await page.request.get(`${origin}/api/auth/csrf`)).json()).data.csrfToken;
  const response = await page.request.fetch(`${origin}${path}`, {
    method,
    data,
    headers: { 'X-CSRF-Token': csrf },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}
async function mailLink(page: Page, email: string, path: string) {
  let link = '';
  await expect
    .poll(
      async () => {
        const inbox = await (await page.request.get(`${mailbox}/api/v1/messages`)).json();
        for (const item of inbox.messages.slice(0, 50)) {
          if (!item.To.some((recipient: { Address: string }) => recipient.Address === email))
            continue;
          const message = await (
            await page.request.get(`${mailbox}/api/v1/message/${item.ID}`)
          ).json();
          link =
            (message.Text as string).match(/https:\/\/[^\s]+/g)?.find((value) => {
              const url = new URL(value);
              return url.origin === origin && `${url.pathname}${url.hash}`.startsWith(path);
            }) ?? '';
          if (link) {
            if (path.startsWith('/tickets/'))
              expect(message.Text).not.toContain('PRIVATE ENGINEERING');
            return true;
          }
        }
        return false;
      },
      { message: 'Expected captured fictional email', timeout: 20000 },
    )
    .toBe(true);
  return link;
}
async function capture(page: Page, name: string) {
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const directory = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/first-customer');
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: resolve(directory, `customer-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

test('selected-client setup and fresh role accounts complete separate acceptance and changes journeys', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 5 }, () =>
      browser.newContext({
        baseURL: origin,
        ignoreHTTPSErrors: true,
        viewport: { width: 1440, height: 1000 },
      }),
    ),
  );
  const [admin, developer, reviewer, observer, outsider] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  const suffix = Date.now();
  try {
    await admin!.goto('/login');
    await expect(admin!.getByRole('button', { name: /Continue as/ })).toHaveCount(0);
    await signIn(admin!, 'owner@accounts.example', 'Local-owner-passphrase-42');
    await expect(admin!).toHaveURL(/\/dashboard$/);
    await admin!.goto('/clients');
    const agency = `Harbor Agency ${suffix} (Fictional)`;
    await admin!.getByLabel('Name', { exact: true }).fill(agency);
    await admin!.getByLabel('Contact email', { exact: true }).fill('hello@harbor.example');
    await admin!.getByRole('button', { name: 'Create client', exact: true }).click();
    await expect(admin!.getByRole('cell', { name: agency, exact: true })).toBeVisible();
    await admin!.getByRole('link', { name: 'Start here', exact: true }).click();
    await admin!.getByLabel('Client to set up').selectOption({ label: agency });
    await expect(
      admin!.getByText(`1 of 6 steps recorded for ${agency}.`, { exact: true }),
    ).toBeVisible();
    const clientId = new URL(admin!.url()).searchParams.get('clientId')!;
    await capture(admin!, 'selected-client-empty');
    await admin!.getByRole('link', { name: 'Create project', exact: true }).click();
    await expect(admin!.getByLabel('Client', { exact: true })).toHaveValue(clientId);
    await admin!.getByLabel('Name', { exact: true }).fill('Harbor Shipment Portal');
    await admin!.getByRole('button', { name: 'Create project', exact: true }).click();
    await expect(admin!.getByRole('status').filter({ hasText: 'Project created.' })).toBeVisible();
    await admin!.getByRole('link', { name: "Back to this client's setup" }).click();
    await expect(
      admin!.getByText(`2 of 6 steps recorded for ${agency}.`, { exact: true }),
    ).toBeVisible();
    const project = (
      await (await admin!.request.get(`/api/projects?clientId=${clientId}`)).json()
    ).data.find((p: { clientId: string }) => p.clientId === clientId);
    const otherClient = await write(admin!, '/api/clients', {
      name: `Canal Agency ${suffix} (Fictional)`,
      contactEmail: 'hello@canal.example',
    });
    await write(admin!, '/api/projects', {
      clientId: otherClient.id,
      name: 'Canal private project',
    });
    const people = [
      {
        page: reviewer!,
        name: 'Nina Harbor Reviewer',
        email: `nina-${suffix}@harbor.example`,
        role: 'CLIENT',
        clientId,
      },
      {
        page: developer!,
        name: 'Dana Delivery Developer',
        email: `dana-${suffix}@harbor.example`,
        role: 'DEVELOPER',
        clientId: '',
      },
      {
        page: observer!,
        name: 'Owen Harbor Contact',
        email: `owen-${suffix}@harbor.example`,
        role: 'CLIENT',
        clientId,
      },
      {
        page: outsider!,
        name: 'Cora Canal Reviewer',
        email: `cora-${suffix}@canal.example`,
        role: 'CLIENT',
        clientId: otherClient.id,
      },
    ];
    for (const person of people) {
      await admin!.goto(`/users?clientId=${person.clientId}#invite-account`);
      await expect(admin!.getByLabel('Name', { exact: true })).toBeVisible();
      if (person.clientId)
        await expect(admin!.getByLabel('Organisation', { exact: true })).toHaveValue(
          person.clientId,
        );
      await admin!.getByLabel('Name', { exact: true }).fill(person.name);
      await admin!.getByLabel('Email', { exact: true }).fill(person.email);
      await admin!.getByLabel('Role', { exact: true }).selectOption(person.role);
      await admin!.getByRole('button', { name: 'Send invitation', exact: true }).click();
      await expect(admin!.getByText('Invitation queued.', { exact: true })).toBeVisible();
      const invitation = await mailLink(admin!, person.email, '/set-password#token=');
      if (person === people[0]) {
        await admin!.goto(`/guide?clientId=${clientId}`);
        await expect(
          admin!.getByText('The invited contact must set their own password.', { exact: false }),
        ).toBeVisible();
        await capture(admin!, 'invitation-not-activated');
      }
      await person.page.goto(invitation);
      await person.page.getByLabel('New password', { exact: true }).fill(password);
      await person.page.getByLabel('Confirm password', { exact: true }).fill(password);
      await person.page.getByRole('button', { name: 'Set up account', exact: true }).click();
      await expect(person.page.getByRole('heading', { name: 'Account ready' })).toBeVisible();
      await person.page.goto('/login');
      await signIn(person.page, person.email);
      await expect(person.page).toHaveURL(/\/dashboard$/);
    }
    const reviewerId = (await (await reviewer!.request.get('/api/auth/me')).json()).data.id;
    await admin!.goto(`/guide?clientId=${clientId}`);
    await expect(
      admin!.getByText(`4 of 6 steps recorded for ${agency}.`, { exact: true }),
    ).toBeVisible();
    await capture(admin!, 'active-reviewer');
    await developer!.goto('/guide');
    await capture(developer!, 'developer-guide');
    await reviewer!.goto('/guide');
    await reviewer!.setViewportSize({ width: 390, height: 844 });
    await capture(reviewer!, 'client-guide-mobile');
    await reviewer!.getByRole('button', { name: 'Open navigation' }).click();
    await reviewer!.keyboard.press('Escape');
    await expect(reviewer!.getByRole('button', { name: 'Open navigation' })).toBeFocused();
    await reviewer!.setViewportSize({ width: 1440, height: 1000 });
    const release = await write(admin!, '/api/releases', {
      projectId: project.id,
      version: '1.5.0-demo',
      title: 'Shipment search',
      notes: 'Active and archived search delivered for review.',
    });
    for (const [index, decision] of ['accept', 'changes'].entries()) {
      await reviewer!.goto(`/tickets/new?projectId=${project.id}`);
      await expect(reviewer!.getByLabel('Project', { exact: true })).toHaveValue(project.id);
      await reviewer!
        .getByLabel('Title', { exact: true })
        .fill(
          index ? 'Active shipment NS-1042 still missing' : 'Archived shipment search confirmation',
        );
      await reviewer!
        .getByLabel('Description', { exact: true })
        .fill('Show active and archived shipments when searching by their reference.');
      await reviewer!.getByRole('button', { name: 'Create ticket', exact: true }).click();
      await expect(reviewer!).toHaveURL(/\/tickets\/[a-f0-9-]{36}$/);
      const ticketPath = new URL(reviewer!.url()).pathname;
      await developer!.goto(ticketPath);
      await developer!.getByRole('button', { name: 'Propose outcome', exact: true }).click();
      await developer!
        .getByLabel('Acceptance criteria')
        .fill('Active and archived shipment references return the matching record and status.');
      await developer!.getByLabel('Client reviewer').selectOption(reviewerId);
      await developer!
        .getByRole('button', { name: 'Request outcome agreement', exact: true })
        .click();
      await expect(developer!.getByRole('status', { name: 'Delivery update' })).toContainText(
        'Outcome sent',
      );
      await write(developer!, `/api${ticketPath}/comments`, {
        body: 'PRIVATE ENGINEERING: fixture detail must never leave internal comments.',
        isInternal: true,
      });
      await observer!.goto(ticketPath);
      await expect(
        observer!.getByText('Awaiting a decision from Nina Harbor Reviewer.'),
      ).toBeVisible();
      await expect(
        observer!.getByRole('button', { name: 'Agree outcome', exact: true }),
      ).toHaveCount(0);
      const revision = (await (await observer!.request.get(`/api${ticketPath}/delivery`)).json())
        .data.revisions[0];
      const csrf = (await (await observer!.request.get('/api/auth/csrf')).json()).data.csrfToken;
      const denied = await observer!.request.post(
        `/api${ticketPath}/delivery/${revision.id}/decision`,
        { data: { decision: 'AGREED', feedback: '' }, headers: { 'X-CSRF-Token': csrf } },
      );
      expect(denied.status()).toBe(403);
      await outsider!.goto(ticketPath);
      await expect(outsider!.getByRole('alert')).toBeVisible();
      await expect(
        outsider!.getByText(
          'Show active and archived shipments when searching by their reference.',
        ),
      ).toHaveCount(0);
      expect((await outsider!.request.get(`/api${ticketPath}`)).status()).toBe(404);
      await reviewer!.getByRole('button', { name: 'Logout', exact: true }).click();
      await expect(reviewer!).toHaveURL(/\/login$/);
      const notice = await mailLink(admin!, people[0]!.email, `${ticketPath}#delivery`);
      await reviewer!.goto(notice);
      await expect(reviewer!).toHaveURL(/\/login\?next=/);
      await signIn(reviewer!, people[0]!.email);
      await expect(reviewer!).toHaveURL(`${origin}${ticketPath}#delivery`);
      await reviewer!.getByRole('button', { name: 'Agree outcome', exact: true }).click();
      await expect(reviewer!.getByText('Outcome agreed', { exact: true })).toBeVisible();
      await developer!.reload();
      await developer!.getByLabel('Delivered in release').selectOption(release.id);
      await developer!
        .getByLabel('Delivery notes for the client')
        .fill(
          'Release 1.5.0-demo includes shipment search. Verify an active and an archived reference.',
        );
      await developer!.getByRole('button', { name: 'Request acceptance', exact: true }).click();
      await expect(developer!.getByRole('status', { name: 'Delivery update' })).toContainText(
        'Acceptance requested',
      );
      await reviewer!.reload();
      await expect(reviewer!.getByText('PRIVATE ENGINEERING', { exact: false })).toHaveCount(0);
      if (decision === 'changes') {
        await reviewer!.getByLabel('Request changes', { exact: true }).check();
        await reviewer!
          .getByLabel('What remains unresolved?')
          .fill('Active shipment NS-1042 still returns no matching record.');
        await reviewer!.getByRole('button', { name: 'Send feedback', exact: true }).click();
      } else await reviewer!.getByRole('button', { name: 'Accept delivery', exact: true }).click();
      const outcome = decision === 'accept' ? 'Accepted by client' : 'Changes requested';
      await expect(reviewer!.getByText(outcome, { exact: true })).toBeVisible();
      await reviewer!.getByRole('button', { name: 'Logout', exact: true }).click();
      await expect(reviewer!).toHaveURL(/\/login$/);
      await reviewer!.goto(`${ticketPath}#delivery`);
      await signIn(reviewer!, people[0]!.email);
      await expect(reviewer!.getByText(outcome, { exact: true })).toBeVisible();
      const exported = (
        await (await reviewer!.request.get(`/api${ticketPath}/delivery/export`)).json()
      ).data.content;
      expect(exported).not.toContain('PRIVATE ENGINEERING');
      expect(exported).toContain('Ticket status (separate from acceptance): OPEN');
      await capture(reviewer!, `${decision}-persisted`);
      await reviewer!.setViewportSize({ width: 390, height: 844 });
      await capture(reviewer!, `${decision}-mobile`);
      await reviewer!.setViewportSize({ width: 1440, height: 1000 });
    }
    await admin!.goto(`/guide?clientId=${clientId}`);
    await expect(
      admin!.getByText(`6 of 6 steps recorded for ${agency}.`, { exact: true }),
    ).toBeVisible();
    await admin!.reload();
    await expect(admin!.getByLabel('Client to set up')).toHaveValue(clientId);
    await admin!.getByLabel('Client to set up').selectOption(otherClient.id);
    await expect(admin!.getByText('First request', { exact: true })).toBeVisible();
    await expect(admin!.getByRole('link', { name: 'Open first request', exact: true })).toHaveCount(
      0,
    );
    await admin!.goBack();
    await expect(admin!.getByLabel('Client to set up')).toHaveValue(clientId);
    await admin!.getByLabel('Account menu', { exact: true }).click();
    await admin!.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await admin!.keyboard.press('Escape');
    await capture(admin!, 'setup-dark-return');
  } finally {
    for (const context of contexts) await context.close();
  }
});
