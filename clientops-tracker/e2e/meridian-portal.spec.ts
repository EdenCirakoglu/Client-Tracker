import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test as base,
  type APIResponse,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import type {
  DeliveryPlan,
  DeliveryRecord,
  Project,
  ScopeProposal,
  Ticket,
  TicketQueue,
  User,
} from '../apps/web/src/lib/types';
import { approveScope } from './helpers/scope-review';

const origin = process.env.VERIFY_URL ?? 'https://localhost:8443';
const apiURL = process.env.VERIFY_API_URL ?? origin;
const mailbox = process.env.WORKFLOW_MAIL_URL ?? 'http://localhost:8025';
for (const value of [origin, apiURL, mailbox]) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error(
      'Meridian portal coverage requires disposable loopback data and captured mail.',
    );
}
if (process.env.E2E_ALLOW_DISPOSABLE_DEMO !== 'true')
  throw new Error('Set E2E_ALLOW_DISPOSABLE_DEMO=true for fictional portal fixtures.');

type Role = 'Admin' | 'Developer' | 'Client';
type Theme = 'light' | 'dark';
const themes: Theme[] = ['light', 'dark'];
const widths = [390, 768, 1280, 1440] as const;
const navigation = [
  ['Dashboard', '/dashboard'],
  ['Clients', '/clients'],
  ['Projects', '/projects'],
  ['Delivery plan', '/delivery'],
  ['Tickets', '/tickets'],
  ['Releases', '/releases'],
  ['Progress summaries', '/summaries'],
  ['Accounts', '/users'],
  ['My account', '/account'],
  ['Start here', '/guide'],
] as const;

// Eight logins for this file: role entry 3, real workflow 4, resilience 1.
// Route forms, responsive route matrices and route captures belong to portal-routes.spec.ts.
// No storage-state files, server restarts, auth-limit resets, locale overrides or test retries.
const test = base.extend<{ actor: (role?: Role) => Promise<Page> }>({
  actor: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    const scriptErrors: string[] = [];
    let logins = 0;
    try {
      await use(async (role) => {
        const context = await browser.newContext({
          baseURL: origin,
          ignoreHTTPSErrors: true,
          viewport: { width: 1440, height: 1000 },
          reducedMotion: 'reduce',
          colorScheme: 'light',
        });
        contexts.push(context);
        const page = await context.newPage();
        page.on('pageerror', (error) => scriptErrors.push(error.message));
        page.on('request', (request) => {
          if (new URL(request.url()).pathname === '/api/auth/login' && request.method() === 'POST')
            logins += 1;
        });
        if (role) await login(page, role);
        return page;
      });
      expect(logins, 'At most four real sign-ins per scenario').toBeLessThanOrEqual(4);
      expect(scriptErrors, 'Unhandled browser errors').toEqual([]);
    } finally {
      for (const context of contexts) await context.close();
    }
  },
});
test.describe.configure({ retries: 0 });

async function payload<T>(response: APIResponse): Promise<T> {
  expect(response.ok(), `Fixture API HTTP ${response.status()}`).toBe(true);
  return (await response.json()).data as T;
}
async function read<T>(page: Page, path: string): Promise<T> {
  return payload<T>(await page.request.get(new URL(path, apiURL).href));
}
async function write<T>(page: Page, path: string, data: unknown, method = 'POST'): Promise<T> {
  const { csrfToken } = await read<{ csrfToken: string }>(page, '/api/auth/csrf');
  return payload<T>(
    await page.request.fetch(new URL(path, apiURL).href, {
      method,
      data,
      headers: { 'X-CSRF-Token': csrfToken, Origin: new URL(origin).origin },
    }),
  );
}
async function ready(page: Page, allowError = false) {
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: /^(Loading|Checking session)/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Loading count', { exact: true })).toHaveCount(0);
  if (!allowError) await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
}
async function login(page: Page, role: Role) {
  const config = await read<{ demoEnabled: boolean }>(page, '/api/auth/config');
  expect(config.demoEnabled, 'Use the disposable demo stack, never live customer accounts').toBe(
    true,
  );
  await page.goto('/login');
  expect(await page.evaluate(() => localStorage.getItem('clientops:sidebar'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('clientops:theme'))).toBeNull();
  const response = page.waitForResponse(
    (item) =>
      new URL(item.url()).pathname === '/api/auth/login' && item.request().method() === 'POST',
  );
  await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
  expect(
    (await response).status(),
    'Single sign-in attempt; do not retry exhausted auth limits',
  ).toBe(200);
  await expect(page).toHaveURL(`${origin}/dashboard`);
  await ready(page);
}
async function theme(page: Page, value: Theme) {
  const menu = page.getByLabel('Account menu', { exact: true });
  await menu.click();
  const button = page.getByRole('button', {
    name: `${value === 'dark' ? 'Dark' : 'Light'} theme`,
    exact: true,
  });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-theme', value);
}
async function accessible(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), {
      message: `Document overflow at ${page.url()} (${page.viewportSize()?.width}px)`,
    })
    .toBeLessThanOrEqual(0);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, reason: node.failureSummary })),
    })),
  ).toEqual([]);
}
async function capture(page: Page, name: string) {
  const directory = resolve(process.env.E2E_SCREENSHOT_DIR ?? 'test-results/meridian-portal');
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: resolve(directory, `portal-${name}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}
async function drawer(page: Page) {
  const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true });
  await expect(dialog).toBeVisible();
  const links = dialog.locator('a[href], button:not([disabled])').filter({ visible: true });
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(links.last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(links.first()).toBeFocused();
  await expect(page.locator('.shell-content')).toHaveAttribute('inert', '');
  await accessible(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.shell-content')).not.toHaveAttribute('inert');
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
}
async function navigate(page: Page, label: string, path: string) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 1024;
  if (mobile) {
    await page.getByRole('button', { name: 'Open navigation', exact: true }).focus();
    await page.keyboard.press('Enter');
  }
  const link = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: label, exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${origin}${path}`);
  await ready(page);
  await expect(link).toHaveAttribute('aria-current', 'page');
  if (mobile)
    await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toHaveCount(0);
}

test('three roles land on the dashboard first and retain theme and sidebar preferences', async ({
  actor,
}) => {
  test.setTimeout(360_000);
  for (const role of ['Admin', 'Developer', 'Client'] as const) {
    await test.step(`${role}: fresh browser, preferences and authorised navigation`, async () => {
      const page = await actor(role);
      const headings = {
        Admin: ['Client operations', 'Client setup'],
        Developer: ['Your work', 'Your next actions'],
        Client: ['Your delivery journal', 'Your next decision'],
      };
      await expect(
        page.getByRole('heading', { name: headings[role][0], level: 1, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: headings[role][1], level: 2, exact: true }),
      ).toBeVisible();
      if (role === 'Developer') {
        await expect(page.getByRole('button', { name: /^Ready for me\s/ })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      }
      await expect(
        page.getByRole('button', { name: 'Collapse navigation', exact: true }),
      ).toBeVisible();
      const nav = page.getByRole('navigation', { name: 'Main navigation' });
      const routes = navigation.filter(([, path]) =>
        path === '/users' ? role === 'Admin' : path === '/clients' ? role !== 'Client' : true,
      );
      expect(
        await nav
          .getByRole('link')
          .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
      ).toEqual(routes.map(([, path]) => path));
      if (role === 'Client') {
        await expect(
          page.getByRole('heading', { name: 'Organisation requests', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Developer workload', exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Replies needed', exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
      } else if (role === 'Admin') {
        for (const name of ['Commitments and follow-ups', 'Request follow-up'])
          await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Unassigned', exact: true })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      }
      await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
      for (const value of themes) {
        await theme(page, value);
        await page.reload();
        await ready(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', value);
        await expect(
          page.getByRole('button', { name: 'Expand navigation', exact: true }),
        ).toBeVisible();
        expect(
          await page.evaluate(() => ({
            theme: localStorage.getItem('clientops:theme'),
            sidebar: localStorage.getItem('clientops:sidebar'),
          })),
        ).toEqual({ theme: value, sidebar: 'collapsed' });
        for (const width of widths) {
          await test.step(`${value} dashboard ${width}`, async () => {
            await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
            await accessible(page);
            if (width === 390 || width === 1440)
              await capture(page, `${role.toLowerCase()}-dashboard-${value}-${width}`);
            if (width < 1024) await drawer(page);
          });
        }
      }
      for (const [label, path] of navigation.filter(
        ([, path]) => path === '/tickets' || path === '/account',
      )) {
        await navigate(page, label, path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await expect(
          page.getByRole('button', { name: 'Expand navigation', exact: true }),
        ).toBeVisible();
      }
      await page.goto('/dashboard');
      await ready(page);
      await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
      await page.reload();
      await ready(page);
      await expect(
        page.getByRole('button', { name: 'Collapse navigation', exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('clientops:sidebar'))).toBe('expanded');
    });
  }
});

async function inviteReviewer(admin: Page, reviewer: Page, clientId: string) {
  const email = `meridian-${randomUUID()}@reviewer.example`;
  const password = 'Fictional-reviewer-passphrase-42';
  await write(admin, '/api/users/invitations', {
    name: 'Meridian Fictional Reviewer',
    email,
    role: 'CLIENT',
    clientId,
  });
  let invitation = '';
  await expect
    .poll(
      async () => {
        const response = await admin.request.get(`${mailbox}/api/v1/messages`);
        expect(response.ok(), 'Local captured mailbox must be available').toBe(true);
        const inbox = (await response.json()) as {
          messages: { ID: string; To: { Address: string }[] }[];
        };
        for (const item of inbox.messages.slice(0, 50)) {
          if (!item.To.some((recipient) => recipient.Address === email)) continue;
          const messageResponse = await admin.request.get(`${mailbox}/api/v1/message/${item.ID}`);
          expect(messageResponse.ok()).toBe(true);
          const message = (await messageResponse.json()) as { Text: string };
          invitation =
            message.Text.match(/https?:\/\/[^\s]+/g)?.find((value) => {
              const url = new URL(value);
              return (
                url.origin === origin &&
                url.pathname === '/set-password' &&
                url.hash.startsWith('#token=')
              );
            }) ?? '';
          if (invitation) return true;
        }
        return false;
      },
      { timeout: 20_000, message: 'Fictional reviewer invitation in captured local mail' },
    )
    .toBe(true);
  await reviewer.goto(invitation);
  await reviewer.getByLabel('New password', { exact: true }).fill(password);
  await reviewer.getByLabel('Confirm password', { exact: true }).fill(password);
  await reviewer.getByRole('button', { name: 'Set up account', exact: true }).click();
  await expect(reviewer.getByRole('heading', { name: 'Account ready', exact: true })).toBeVisible();
  await reviewer.goto('/login');
  await reviewer.getByLabel('Email', { exact: true }).fill(email);
  await reviewer.getByLabel('Password', { exact: true }).fill(password);
  await reviewer.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(reviewer).toHaveURL(`${origin}/dashboard`);
  await ready(reviewer);
  return read<User>(reviewer, '/api/auth/me');
}
async function workflowLane(staff: Page, ticket: Ticket, lane: 'ready' | 'changes' | 'waiting') {
  for (const value of ['ready', 'changes', 'waiting']) {
    const query = new URLSearchParams({
      assignment: 'mine',
      workflow: value,
      search: ticket.title,
    });
    const result = await read<TicketQueue>(staff, `/api/tickets/queue?${query}`);
    expect(
      result.items.map((item) => item.id),
      `${value} reflects the current persisted revision`,
    ).toEqual(value === lane ? [ticket.id] : []);
    expect(result.total).toBe(value === lane ? 1 : 0);
  }
  await staff.goto('/dashboard');
  await ready(staff);
  const workflow = staff.getByRole('region', { name: 'Your next actions', exact: true });
  const labels = {
    ready: 'Ready for me',
    changes: 'Changes requested',
    waiting: 'Waiting for client',
  };
  const tab = workflow.getByRole('button', { name: new RegExp(`^${labels[lane]}\\s`) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
  const viewAll = workflow.getByRole('link', { name: 'View all', exact: true });
  const target = new URL((await viewAll.getAttribute('href'))!, origin);
  expect(target.searchParams.get('workflow')).toBe(lane);
  expect(target.searchParams.get('assignment')).toBe('mine');
  await viewAll.click();
  await expect(staff).toHaveURL(target.href);
  await ready(staff);
  await expect(staff.getByLabel('Filter by workflow', { exact: true })).toHaveValue(lane);
  await expect(staff.getByLabel('Filter by assignment', { exact: true })).toHaveValue('mine');
  await staff.getByRole('textbox', { name: 'Search tickets', exact: true }).fill(ticket.title);
  await expect(
    staff.getByRole('main').getByRole('link', { name: ticket.title, exact: true }),
  ).toBeVisible();
  await expect.poll(() => new URL(staff.url()).searchParams.get('search')).toBe(ticket.title);
  await staff.reload();
  await ready(staff);
  expect(new URL(staff.url()).searchParams.get('workflow')).toBe(lane);
  expect(new URL(staff.url()).searchParams.get('assignment')).toBe('mine');
  await expect(staff.getByLabel('Filter by workflow', { exact: true })).toHaveValue(lane);
  await expect(staff.getByLabel('Filter by assignment', { exact: true })).toHaveValue('mine');
}
async function openDecision(page: Page, title: string, action: string, anchor: string) {
  await page.goto('/dashboard');
  await ready(page);
  const next = page.getByRole('region', { name: 'Your next decision', exact: true });
  await expect(next.getByRole('heading', { name: title, level: 3, exact: true })).toBeVisible();
  const link = next.getByRole('link', { name: action, exact: true });
  await expect(link).toHaveAttribute('href', new RegExp(`#${anchor}$`));
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/tickets/[a-f0-9-]{36}#${anchor}$`));
  await ready(page);
}

test('real reviewer decisions persist; staff and same-organisation non-reviewers get truthful actions', async ({
  actor,
}) => {
  test.setTimeout(300_000);
  const admin = await actor('Admin');
  const staff = await actor('Developer');
  const observer = await actor('Client');
  const reviewer = await actor();
  const contact = await read<User>(observer, '/api/auth/me');
  expect(contact.clientId).toBeTruthy();
  const person = await inviteReviewer(admin, reviewer, contact.clientId!);
  const owner = await read<User>(staff, '/api/auth/me');
  const projects = await read<Project[]>(reviewer, '/api/projects');
  const project = projects.find((item) => item.name === 'Operations Portal');
  expect(project, 'Seeded fictional Operations Portal').toBeTruthy();
  const ticket = await write<Ticket>(reviewer, '/api/tickets', {
    projectId: project!.id,
    title: `Meridian fictional shipment review ${randomUUID().slice(0, 8)}`,
    description: 'Find active and archived shipments by their original customer reference.',
    category: 'FEATURE_REQUEST',
  });
  const path = `/api/tickets/${ticket.id}`;
  const url = `/tickets/${ticket.id}`;
  await write(staff, path, { assignedToId: owner.id }, 'PATCH');
  const proposal = {
    approverId: person.id,
    scope: 'Find active shipments by customer reference.',
    exclusions: 'Archived shipments are excluded from the initial proposal.',
    estimate: 'One engineering day, estimate only.',
    deliveryImplications: 'Client verification follows the next Operations Portal release.',
    externalReference: 'FICTIONAL-MERIDIAN-PORTAL',
  };
  const first = await write<ScopeProposal[]>(staff, `${path}/scope`, {
    ...proposal,
    expectedRevision: 0,
  });
  await workflowLane(staff, ticket, 'waiting');
  for (const [role, page] of [
    ['staff', staff],
    ['non-reviewer', observer],
  ] as const) {
    await page.goto(url);
    await ready(page);
    await expect(
      page
        .locator('#scope-decision-panel')
        .getByText(`Only ${person.name} can record this decision.`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Approve revision/ })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Request scope changes', exact: true }),
    ).toHaveCount(0);
    await accessible(page);
    await capture(page, `${role}-scope-waiting`);
  }
  const { csrfToken } = await read<{ csrfToken: string }>(observer, '/api/auth/csrf');
  const forbidden = await observer.request.post(
    new URL(`${path}/scope/${first[0]!.id}/decision`, apiURL).href,
    {
      data: { decision: 'APPROVED', feedback: '' },
      headers: { 'X-CSRF-Token': csrfToken, Origin: new URL(origin).origin },
    },
  );
  expect(forbidden.status()).toBe(403);
  expect((await forbidden.json()).error.code).toBe('NOT_APPROVER');
  expect((await read<ScopeProposal[]>(reviewer, `${path}/scope`))[0]!.state).toBe('PROPOSED');
  const otherDecisions = await read<DeliveryPlan>(
    observer,
    '/api/dashboard/delivery?view=mine&limit=50',
  );
  expect(otherDecisions.items.some((item) => item.ticketId === ticket.id)).toBe(false);
  await observer.goto('/dashboard');
  await ready(observer);
  await expect(
    observer
      .getByRole('region', { name: 'Your next decision', exact: true })
      .locator(`a[href^="${url}"]`),
  ).toHaveCount(0);

  await openDecision(reviewer, ticket.title, 'Review scope revision 1', 'scope');
  await reviewer.getByRole('button', { name: 'Request scope changes', exact: true }).click();
  const changes = reviewer.getByRole('dialog', { name: 'Request scope changes', exact: true });
  await changes
    .getByLabel('Reason for your decision')
    .fill('Include archived shipments as well as active shipments.');
  await changes.getByRole('button', { name: 'Record scope decision', exact: true }).click();
  await expect(changes).toHaveCount(0);
  await reviewer.reload();
  await expect(reviewer.getByText('Revision 1: Changes Requested', { exact: true })).toBeVisible();
  await workflowLane(staff, ticket, 'changes');
  await write(staff, `${path}/scope`, {
    ...proposal,
    expectedRevision: 1,
    scope: 'Find active and archived shipments by customer reference.',
    exclusions: 'Bulk exports are excluded.',
  });
  await openDecision(reviewer, ticket.title, 'Review scope revision 2', 'scope');
  await approveScope(reviewer, 2);
  await reviewer.reload();
  await expect(reviewer.getByText('Revision 2: Approved', { exact: true })).toBeVisible();
  const scopes = await read<ScopeProposal[]>(reviewer, `${path}/scope`);
  expect(scopes.map((item) => item.state)).toEqual(['APPROVED', 'CHANGES_REQUESTED']);
  await workflowLane(staff, ticket, 'ready');

  const delivery = await write<DeliveryRecord>(staff, `${path}/delivery`, {
    expectedRevision: 0,
    reviewerId: person.id,
    ownerId: owner.id,
    outcome: 'An active and an archived shipment reference each return the matching shipment.',
    targetDate: null,
  });
  await write(staff, `${path}/comments`, {
    body: 'PRIVATE ENGINEERING: fictional diagnostic detail.',
    isInternal: true,
  });
  for (const page of [staff, observer]) {
    await page.goto(`${url}#delivery`);
    await ready(page);
    await expect(
      page.getByText(`Awaiting outcome agreement from ${person.name}.`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agree outcome', exact: true })).toHaveCount(0);
  }
  await openDecision(reviewer, ticket.title, 'Review outcome agreement', 'delivery');
  await reviewer.getByRole('button', { name: 'Agree outcome', exact: true }).click();
  await expect(reviewer.getByText('Outcome agreed', { exact: true })).toBeVisible();
  const release = await write<{ id: string }>(admin, '/api/releases', {
    projectId: project!.id,
    version: `portal-${randomUUID().slice(0, 8)}`,
    title: 'Fictional shipment search delivery',
    notes: 'Active and archived reference lookup.',
  });
  await write(staff, `${path}/delivery/${delivery.revisions[0]!.id}/request-acceptance`, {
    releaseId: release.id,
    deliveryNotes: 'Verify one active and one archived customer reference.',
  });
  await workflowLane(staff, ticket, 'waiting');
  await observer.goto(`${url}#delivery`);
  // This observer is already at the same URL. Hash navigation does not reload
  // revisions changed in a different session; verify the persisted read explicitly.
  await observer.reload();
  await ready(observer);
  await expect(
    observer.getByText(`Awaiting a delivery decision from ${person.name}.`, { exact: true }),
  ).toBeVisible();
  await expect(observer.getByRole('button', { name: 'Accept delivery', exact: true })).toHaveCount(
    0,
  );
  await openDecision(reviewer, ticket.title, 'Review delivered work', 'delivery');
  await expect(reviewer.getByText('PRIVATE ENGINEERING', { exact: false })).toHaveCount(0);
  await reviewer.getByRole('button', { name: 'Accept delivery', exact: true }).click();
  await expect(
    reviewer.getByRole('heading', { name: 'Accepted by client', exact: true }),
  ).toBeVisible();
  await reviewer.reload();
  await expect(
    reviewer.getByRole('heading', { name: 'Accepted by client', exact: true }),
  ).toBeVisible();
  expect((await read<DeliveryRecord>(reviewer, `${path}/delivery`)).revisions[0]!.state).toBe(
    'ACCEPTED',
  );
  expect((await read<Ticket>(reviewer, path)).status).toBe('OPEN');
  expect((await read<DeliveryPlan>(reviewer, '/api/dashboard/delivery?view=mine')).items).toEqual(
    [],
  );
  for (const value of themes) {
    await theme(reviewer, value);
    for (const width of widths) {
      await reviewer.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await accessible(reviewer);
      if (width === 390) await capture(reviewer, `accepted-delivery-${value}-${width}`);
    }
  }
});

test('fixture-only resilience: API failures are not successful empty decisions or ticket queues', async ({
  actor,
}) => {
  const page = await actor('Client');
  const deliveryEndpoint = '**/api/dashboard/delivery?*';
  const queueEndpoint = '**/api/tickets/queue?*';
  const decision = page.getByRole('region', { name: 'Your next decision', exact: true });
  // Only this scenario intercepts responses. These are presentation fixtures, not workflow evidence.
  await page.route(deliveryEndpoint, (route) =>
    route.fulfill({
      status: 503,
      json: {
        success: false,
        error: {
          code: 'UNAVAILABLE',
          message: 'Decision service unavailable (resilience fixture).',
        },
      },
    }),
  );
  await page.reload();
  await ready(page, true);
  await expect(decision.getByRole('alert')).toContainText(
    'Decision service unavailable (resilience fixture).',
  );
  await expect(
    decision.getByText('No decisions are awaiting your review.', { exact: true }),
  ).toHaveCount(0);
  await accessible(page);
  await capture(page, 'fixture-decision-error');
  await page.unroute(deliveryEndpoint);
  const realDelivery = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/dashboard/delivery',
  );
  await decision.getByRole('button', { name: 'Retry', exact: true }).click();
  expect((await realDelivery).ok()).toBe(true);
  await expect(decision.getByRole('alert')).toHaveCount(0);

  const actual = await read<DeliveryPlan>(page, '/api/dashboard/delivery?view=mine&limit=4');
  await page.route(deliveryEndpoint, (route) =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          ...actual,
          items: [],
          total: 0,
          counts: Object.fromEntries(Object.keys(actual.counts).map((key) => [key, 0])),
        },
      },
    }),
  );
  await page.reload();
  await ready(page);
  await expect(
    decision.getByText('No decisions are awaiting your review.', { exact: true }),
  ).toBeVisible();
  await expect(decision.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await page.unroute(deliveryEndpoint);

  await page.route(queueEndpoint, (route) =>
    route.fulfill({
      status: 503,
      json: {
        success: false,
        error: { code: 'UNAVAILABLE', message: 'Ticket service unavailable (resilience fixture).' },
      },
    }),
  );
  await page.goto('/tickets');
  await ready(page, true);
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Ticket service unavailable (resilience fixture).',
  );
  await expect(page.getByRole('heading', { name: 'No tickets found', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await theme(page, 'dark');
  await accessible(page);
  await capture(page, 'fixture-ticket-error-dark-390');
  await page.unroute(queueEndpoint);
  const realQueue = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/tickets/queue',
  );
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  expect((await realQueue).ok()).toBe(true);
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('table')).toBeVisible();
  await page.route(queueEndpoint, (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, data: { items: [], total: 0, page: 1, limit: 20 } },
    }),
  );
  await page.reload();
  await ready(page);
  await expect(page.getByRole('heading', { name: 'No tickets found', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await accessible(page);
  await page.unroute(queueEndpoint);
});
