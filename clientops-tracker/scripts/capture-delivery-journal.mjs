/* global document, scrollTo */
import { chromium, request, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const origin = process.env.VERIFY_URL ?? 'https://localhost:8460';
const mailbox = process.env.WORKFLOW_MAIL_URL ?? 'http://localhost:8040';
if (
  ![origin, mailbox].every((url) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname)) ||
  process.env.E2E_ALLOW_DISPOSABLE_DEMO !== 'true'
)
  throw new Error('Use explicitly designated loopback fixtures only.');
const stage = process.argv.includes('--before') ? 'before' : 'after';
const directory = resolve(process.env.JOURNAL_EVIDENCE_DIR ?? `test-results/journal-${stage}`);
mkdirSync(directory, { recursive: true });
const fixtureFile = 'test-results/journal-records.json';
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
async function mutate(api, path, data) {
  const csrf = (await (await api.get('/api/auth/csrf')).json()).data.csrfToken;
  const response = await api.post(path, { data, headers: { 'X-CSRF-Token': csrf } });
  if (!response.ok()) throw new Error(`Fixture request ${path}: ${response.status()}`);
  return (await response.json()).data;
}
async function account(email) {
  const api = await request.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
  await mutate(api, '/api/auth/login', { email, password: 'password123' });
  return api;
}
let records;
if (existsSync(fixtureFile)) records = JSON.parse(readFileSync(fixtureFile, 'utf8'));
else {
  const staff = await account('developer@example.com');
  const client = await account('client@example.com');
  const person = (await (await client.get('/api/auth/me')).json()).data;
  const project = (await (await client.get('/api/projects')).json()).data[0];
  const ticket = await mutate(client, '/api/tickets', {
    projectId: project.id,
    title: 'Shipment reference search',
    description:
      'Our dispatch team needs to find archived shipments using the original customer reference.',
    category: 'FEATURE_REQUEST',
  });
  const proposal = {
    approverId: person.id,
    scope: 'Find active shipments by customer reference.',
    exclusions: 'Archived shipments excluded.',
    estimate: 'One day, estimate only.',
    deliveryImplications: 'Review the change in the next release.',
    externalReference: 'DEMO-Q-104',
  };
  const first = await mutate(staff, `/api/tickets/${ticket.id}/scope`, {
    ...proposal,
    expectedRevision: 0,
  });
  await mutate(client, `/api/tickets/${ticket.id}/scope/${first[0].id}/decision`, {
    decision: 'CHANGES_REQUESTED',
    feedback: 'Please include archived shipments in this search.',
  });
  await mutate(staff, `/api/tickets/${ticket.id}/scope`, {
    ...proposal,
    expectedRevision: 1,
    scope: 'Find active and archived shipments by customer reference.',
    exclusions: 'Historical imports are not included.',
    estimate: 'Two days, estimate only.',
  });
  const outcome = await mutate(staff, `/api/tickets/${ticket.id}/delivery`, {
    expectedRevision: 0,
    reviewerId: person.id,
    outcome: 'A dispatcher can locate active shipments by customer reference.',
    targetDate: '2026-11-06',
  });
  await mutate(client, `/api/tickets/${ticket.id}/delivery/${outcome.revisions[0].id}/decision`, {
    decision: 'CHANGES_REQUESTED',
    feedback: 'The agreed outcome should include archived shipments too.',
  });
  await mutate(staff, `/api/tickets/${ticket.id}/delivery`, {
    expectedRevision: 1,
    reviewerId: person.id,
    outcome: 'A dispatcher can locate active and archived shipments by customer reference.',
    targetDate: '2026-11-09',
  });
  const summary = await mutate(staff, '/api/summaries', {
    clientId: person.clientId,
    weekStart: new Date().toISOString().slice(0, 10),
  });
  const firstPublication = await mutate(staff, `/api/summaries/${summary.id}/publish`, {
    recipientIds: [person.id],
  });
  const repeatPublication = await mutate(staff, `/api/summaries/${summary.id}/publish`, {
    recipientIds: [person.id],
  });
  records = {
    ticketId: ticket.id,
    summaryId: summary.id,
    firstHasOutcomes: !!firstPublication.notifications,
    repeatHasOutcomes: !!repeatPublication.notifications,
  };
  writeFileSync(fixtureFile, JSON.stringify(records, null, 2));
  await staff.dispose();
  await client.dispose();
}
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome' });
const captures = [];
async function accessible(page) {
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
}
try {
  for (const role of ['Admin', 'Developer', 'Client']) {
    const context = await browser.newContext({
      baseURL: origin,
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByRole('button', { name: `Continue as ${role}`, exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const screen of role === 'Client' ? ['home', 'ticket', 'summary'] : ['home']) {
      for (const width of role === 'Client' ? [1440, 390] : [1440]) {
        const height = width === 390 ? 844 : 1000;
        await page.setViewportSize({ width, height });
        await page.goto(
          screen === 'home'
            ? '/dashboard'
            : screen === 'ticket'
              ? `/tickets/${records.ticketId}`
              : `/summaries/${records.summaryId}`,
        );
        await expect(page.locator('main h1')).toBeVisible();
        if (screen === 'ticket')
          await expect(
            page.getByRole('button', { name: 'Agree outcome', exact: true }),
          ).toBeVisible();
        if (screen === 'home')
          await expect(
            page.getByRole('heading', { name: 'Needs attention', exact: true }),
          ).toBeVisible();
        if (screen === 'summary')
          await expect(
            page.getByRole('heading', { name: 'Delivery decisions', exact: true }),
          ).toBeVisible();
        await expect(page.getByRole('status').filter({ hasText: /Loading|Checking/ })).toHaveCount(
          0,
        );
        await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => scrollTo(0, 0));
        const file = `${role.toLowerCase()}-${screen}-${width}-light.png`;
        if (stage === 'after') await accessible(page);
        await page.screenshot({
          path: resolve(directory, file),
          fullPage: true,
          animations: 'disabled',
        });
        captures.push({ file, role, screen, viewport: { width, height }, theme: 'light' });
        if (stage === 'after') {
          await page.getByLabel('Account menu', { exact: true }).click();
          await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
          await page.keyboard.press('Escape');
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
          await accessible(page);
          const darkFile = file.replace('-light.png', '-dark.png');
          await page.screenshot({
            path: resolve(directory, darkFile),
            fullPage: true,
            animations: 'disabled',
          });
          captures.push({
            file: darkFile,
            role,
            screen,
            viewport: { width, height },
            theme: 'dark',
          });
          await page.getByLabel('Account menu', { exact: true }).click();
          await page.getByRole('button', { name: 'Light theme', exact: true }).click();
          await page.keyboard.press('Escape');
        }
      }
    }
    await context.close();
  }
  const anonymous = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
  const page = await anonymous.newPage();
  let notice;
  await expect
    .poll(
      async () => {
        const inbox = await (await page.request.get(`${mailbox}/api/v1/messages`)).json();
        for (const message of inbox.messages.slice(0, 50)) {
          const detail = await (
            await page.request.get(`${mailbox}/api/v1/message/${message.ID}`)
          ).json();
          const link = detail.Text.match(/https?:\/\/[^\s]+/g)?.find((url) =>
            url.includes(`${records.ticketId}#scope`),
          );
          if (link) {
            notice = link;
            return true;
          }
        }
        return false;
      },
      { timeout: 20000 },
    )
    .toBe(true);
  await page.goto(notice);
  await expect(page).toHaveURL(/\/login/);
  const signedOutUrl = new URL(page.url()).pathname + new URL(page.url()).search;
  await page.getByRole('button', { name: 'Continue as Client', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  if (stage === 'after') {
    await expect(page).toHaveURL(notice);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('scope');
  }
  const destination = new URL(page.url()).pathname + new URL(page.url()).hash;
  await page.screenshot({ path: resolve(directory, 'email-after-sign-in.png'), fullPage: true });
  writeFileSync(
    resolve(directory, 'capture.json'),
    JSON.stringify(
      {
        revision,
        stage,
        records,
        captures,
        signedOutUrl,
        destination,
        workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], {
          encoding: 'utf8',
        }).trim(),
        screenReader: 'Manual acceptance pending',
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      revision,
      stage,
      captures: captures.length,
      signedOutUrl,
      destination,
      firstHasOutcomes: records.firstHasOutcomes,
      repeatHasOutcomes: records.repeatHasOutcomes,
    }),
  );
  await anonymous.close();
} finally {
  await browser.close();
}
