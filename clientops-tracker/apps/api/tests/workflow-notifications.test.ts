import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import {
  mailOutbox,
  progressSummaries,
  projects,
  scopeProposals,
  tickets,
  users,
} from '../src/db/schema';
import { proposeScope, decideScope } from '../src/services/scope.service';
import { proposeOutcome, decideDelivery } from '../src/services/delivery.service';
import {
  claimMail,
  deliverMail,
  drainMail,
  mailDeliveryStatus,
} from '../src/services/mail-outbox.service';
import { decryptMail } from '../src/services/mail-payload';
import {
  generateSummary,
  publishSummary,
  summaryRecipients,
} from '../src/services/summary.service';
import { notificationPreferences } from '../src/services/notification-preferences.service';
import { onboardingForAdmin } from '../src/services/onboarding.service';
import type { AuthenticatedUser } from '../src/types/auth';
import { authHeader, loginSession } from './helpers/auth';

let staff: AuthenticatedUser, client: AuthenticatedUser, other: AuthenticatedUser, ticketId: string;
const app = createApp();
const scope = () => ({
  expectedRevision: 0,
  approverId: client.id,
  scope: 'Search archived delivery references.',
  exclusions: 'No imports.',
  estimate: 'Two days estimate.',
  deliveryImplications: 'Review the next proposed delivery.',
  externalReference: '',
});
const queued = async () => (await db.select().from(mailOutbox).orderBy(mailOutbox.createdAt))[0]!;
beforeEach(async () => {
  await seedDatabase();
  staff = (await db.select().from(users).where(eq(users.email, 'developer@example.com')))[0]!;
  client = (await db.select().from(users).where(eq(users.email, 'client@example.com')))[0]!;
  other = (await db.select().from(users).where(eq(users.email, 'bluewave@example.com')))[0]!;
  const [project] = await db.select().from(projects).where(eq(projects.clientId, client.clientId!));
  const [ticket] = await db
    .insert(tickets)
    .values({
      projectId: project!.id,
      createdById: client.id,
      title: 'Archived delivery references',
      description: 'Include archived references in the search results.',
      category: 'FEATURE_REQUEST',
    })
    .returning();
  ticketId = ticket!.id;
});
afterAll(() => pool.end());

it('queues encrypted references atomically and sends only a portal link to the designated reviewer', async () => {
  const [proposal] = await proposeScope(staff, ticketId, scope());
  const job = await queued();
  expect(job).toMatchObject({
    kind: 'WORKFLOW',
    recipientId: client.id,
    notificationEvent: 'SCOPE_REVIEW',
  });
  expect(job.payload).not.toContain(client.id);
  expect(decryptMail(job.id, job.payload!)).toMatchObject({
    recordId: proposal!.id,
    expectedState: 'PROPOSED',
  });
  const send = vi.fn().mockResolvedValue(undefined),
    accountSend = vi.fn();
  await Promise.all([drainMail(1, accountSend, send), drainMail(1, accountSend, send)]);
  expect(send).toHaveBeenCalledExactlyOnceWith(
    client.email,
    `/tickets/${ticketId}#scope`,
    'SCOPE_REVIEW',
  );
  expect(accountSend).not.toHaveBeenCalled();
  expect(await queued()).toMatchObject({ status: 'DELIVERED', payload: null });
});

it.each(['DISABLED', 'organisation', 'role', 'preference'] as const)(
  'rechecks recipient %s before dispatch',
  async (change) => {
    await proposeScope(staff, ticketId, scope());
    await db
      .update(users)
      .set(
        change === 'DISABLED'
          ? { accountStatus: 'DISABLED' }
          : change === 'organisation'
            ? { clientId: other.clientId }
            : change === 'role'
              ? { role: 'DEVELOPER' }
              : { workflowNotifications: false },
      )
      .where(eq(users.id, client.id));
    const send = vi.fn();
    await drainMail(5, vi.fn(), send);
    expect(send).not.toHaveBeenCalled();
    expect(await queued()).toMatchObject({
      status: 'EXPIRED',
      payload: null,
      lastError: change === 'preference' ? 'OPTED_OUT' : 'RECIPIENT_UNAVAILABLE',
    });
  },
);

it('suppresses stale revisions and deduplicates repeated decisions to the responsible internal user', async () => {
  await proposeScope(staff, ticketId, scope());
  const [current] = await proposeScope(staff, ticketId, { ...scope(), expectedRevision: 1 });
  const old = (await claimMail())!;
  const send = vi.fn().mockResolvedValue(undefined);
  await deliverMail(old, vi.fn(), send);
  expect(send).not.toHaveBeenCalled();
  const decision = { decision: 'APPROVED' as const, feedback: '' };
  await decideScope(client, ticketId, current!.id, decision);
  await decideScope(client, ticketId, current!.id, decision);
  const rows = await db
    .select()
    .from(mailOutbox)
    .where(eq(mailOutbox.notificationEvent, 'SCOPE_DECISION'));
  expect(rows).toHaveLength(1);
  await drainMail(10, vi.fn(), send);
  expect(send).toHaveBeenCalledExactlyOnceWith(
    staff.email,
    `/tickets/${ticketId}#scope`,
    'SCOPE_DECISION',
  );
});

it('records delivery owner decisions separately from scope and suppresses resolved review requests', async () => {
  const record = await proposeOutcome(staff, ticketId, {
    expectedRevision: 0,
    reviewerId: client.id,
    outcome: 'Archived references appear in the results.',
  });
  await decideDelivery(client, ticketId, record.revisions[0]!.id, {
    decision: 'AGREED',
    feedback: '',
  });
  const send = vi.fn().mockResolvedValue(undefined);
  await drainMail(10, vi.fn(), send);
  expect(send).toHaveBeenCalledExactlyOnceWith(
    staff.email,
    `/tickets/${ticketId}#delivery`,
    'DELIVERY_DECISION',
  );
});

it('recovers persisted SMTP retries and fences duplicate workers after a simulated process restart', async () => {
  await proposeScope(staff, ticketId, scope());
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await drainMail(
      1,
      vi.fn(),
      vi.fn().mockRejectedValue(new Error('private recipient transport error')),
    );
    expect(await queued()).toMatchObject({
      status: 'PENDING',
      lastError: 'DELIVERY_FAILED',
      attempts: 1,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private recipient');
    await db.update(mailOutbox).set({ availableAt: new Date(0) });
    const stale = (await claimMail())!;
    await db.update(mailOutbox).set({ leaseUntil: new Date(0) });
    const replacement = (await claimMail())!;
    const send = vi.fn().mockResolvedValue(undefined);
    await deliverMail(stale, vi.fn(), send);
    expect(send).not.toHaveBeenCalled();
    await deliverMail(replacement, vi.fn(), send);
    await deliverMail(replacement, vi.fn(), send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await queued()).toMatchObject({ status: 'DELIVERED', attempts: 3 });
  } finally {
    log.mockRestore();
  }
});

it('holds recipient and ticket authorization stable during the bounded transport call', async () => {
  await proposeScope(staff, ticketId, scope());
  const send = vi.fn(async () => {
    await expect(
      pool.query('SELECT id FROM users WHERE id = $1 FOR UPDATE NOWAIT', [client.id]),
    ).rejects.toMatchObject({ code: '55P03' });
    await expect(
      pool.query('SELECT id FROM tickets WHERE id = $1 FOR UPDATE NOWAIT', [ticketId]),
    ).rejects.toMatchObject({ code: '55P03' });
  });
  await drainMail(1, vi.fn(), send);
  expect(send).toHaveBeenCalledTimes(1);
  expect(await queued()).toMatchObject({ status: 'DELIVERED' });
});

it('expires notices after seven days and makes exhausted delivery visible without message content', async () => {
  await proposeScope(staff, ticketId, scope());
  await db.update(mailOutbox).set({ expiresAt: new Date(0) });
  expect(await claimMail()).toBeNull();
  expect(await queued()).toMatchObject({ status: 'EXPIRED', payload: null });
  await proposeScope(staff, ticketId, { ...scope(), expectedRevision: 1 });
  await db.update(mailOutbox).set({ attempts: 8 }).where(eq(mailOutbox.status, 'PENDING'));
  expect(await claimMail()).toBeNull();
  const status = await mailDeliveryStatus();
  expect(
    status.recent.some((j) => j.status === 'FAILED' && j.notificationEvent === 'SCOPE_REVIEW'),
  ).toBe(true);
  expect(JSON.stringify(status)).not.toContain('payload');
});

it('rolls back a proposed scope if durable enqueue fails', async () => {
  await db.execute(
    sql`CREATE FUNCTION reject_workflow_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$`,
  );
  await db.execute(
    sql`CREATE TRIGGER reject_workflow_fixture BEFORE INSERT ON mail_outbox FOR EACH ROW EXECUTE FUNCTION reject_workflow_fixture()`,
  );
  try {
    await expect(proposeScope(staff, ticketId, scope())).rejects.toThrow();
    expect(
      await db.select().from(scopeProposals).where(eq(scopeProposals.ticketId, ticketId)),
    ).toHaveLength(0);
  } finally {
    await db.execute(sql`DROP TRIGGER reject_workflow_fixture ON mail_outbox`);
    await db.execute(sql`DROP FUNCTION reject_workflow_fixture()`);
  }
});

it('requires explicit permitted summary recipients and deduplicates publication notifications', async () => {
  const summary = await generateSummary(staff, {
    clientId: client.clientId!,
    weekStart: '2026-10-19',
    upcoming: [],
    blocked: [],
  });
  await expect(summaryRecipients(client, summary.id)).rejects.toMatchObject({ statusCode: 403 });
  await expect(publishSummary(staff, summary.id, [other.id])).rejects.toThrow();
  await publishSummary(staff, summary.id);
  expect(await db.select().from(mailOutbox)).toHaveLength(0);
  expect(
    (await publishSummary(staff, summary.id, [client.id, client.id])).notifications,
  ).toMatchObject({ queued: 1, alreadyRequested: 0, notQueued: 0 });
  expect((await publishSummary(staff, summary.id, [client.id])).notifications).toMatchObject({
    queued: 0,
    alreadyRequested: 1,
    notQueued: 0,
  });
  expect(await db.select().from(mailOutbox)).toHaveLength(1);
  const send = vi.fn().mockResolvedValue(undefined);
  await drainMail(5, vi.fn(), send);
  expect(send).toHaveBeenCalledExactlyOnceWith(
    client.email,
    `/summaries/${summary.id}`,
    'SUMMARY_PUBLISHED',
  );
  expect((await publishSummary(staff, summary.id, [client.id])).notifications).toMatchObject({
    queued: 0,
    alreadyRequested: 1,
  });
  expect(await db.select().from(mailOutbox)).toHaveLength(1);
});

async function draftSummary() {
  return generateSummary(staff, {
    clientId: client.clientId!,
    weekStart: '2026-10-19',
    upcoming: [],
    blocked: [],
  });
}

it('counts mixed new/existing recipients accurately and serializes concurrent publication', async () => {
  const [second] = await db
    .insert(users)
    .values({
      name: 'Second fictional contact',
      email: 'second@contacts.example',
      passwordHash: 'not-a-login-hash',
      role: 'CLIENT',
      clientId: client.clientId,
      accountStatus: 'ACTIVE',
    })
    .returning();
  const summary = await draftSummary();
  const first = await publishSummary(staff, summary.id, [client.id]);
  const outcomes = await Promise.all([
    publishSummary(staff, summary.id, [client.id, second!.id]),
    publishSummary(staff, summary.id, [client.id, second!.id]),
  ]);
  expect(outcomes.map((r) => r.notifications.queued).sort()).toEqual([0, 1]);
  expect(outcomes.map((r) => r.notifications.alreadyRequested).sort()).toEqual([1, 2]);
  expect(outcomes.every((r) => r.notifications.notQueued === 0)).toBe(true);
  expect(outcomes.every((r) => r.publishedAt!.getTime() === first.publishedAt!.getTime())).toBe(
    true,
  );
  expect(await db.select().from(mailOutbox)).toHaveLength(2);
});

it('rejects mixed eligible/ineligible contacts atomically and rechecks eligibility on repeats', async () => {
  const summary = await draftSummary();
  await expect(publishSummary(staff, summary.id, [client.id, other.id])).rejects.toMatchObject({
    code: 'INVALID_RECIPIENTS',
  });
  expect(await db.select().from(mailOutbox)).toHaveLength(0);
  expect(
    (await db.select().from(progressSummaries).where(eq(progressSummaries.id, summary.id)))[0]!
      .publishedAt,
  ).toBeNull();
  await publishSummary(staff, summary.id, [client.id]);
  await notificationPreferences(client, false);
  await expect(publishSummary(staff, summary.id, [client.id])).rejects.toMatchObject({
    code: 'INVALID_RECIPIENTS',
  });
  const send = vi.fn();
  await drainMail(5, vi.fn(), send);
  expect(send).not.toHaveBeenCalled();
  expect(await queued()).toMatchObject({ status: 'EXPIRED' });
  await notificationPreferences(client, true);
  expect((await publishSummary(staff, summary.id, [client.id])).notifications).toMatchObject({
    queued: 0,
    alreadyRequested: 1,
  });
});

it('does not silently retry a failed delivery when publication is requested again', async () => {
  const summary = await draftSummary();
  await publishSummary(staff, summary.id, [client.id]);
  await db.update(mailOutbox).set({ attempts: 8 });
  expect(await claimMail()).toBeNull();
  expect(await queued()).toMatchObject({ status: 'FAILED' });
  expect((await publishSummary(staff, summary.id, [client.id])).notifications).toMatchObject({
    queued: 0,
    alreadyRequested: 1,
  });
  expect(await db.select().from(mailOutbox)).toHaveLength(1);
});

it('persists self-service preferences, enforces CSRF, and keeps onboarding administrator-only', async () => {
  expect(await notificationPreferences(client, false)).toEqual({ workflowNotifications: false });
  expect(await notificationPreferences(client)).toEqual({ workflowNotifications: false });
  const auth = await loginSession(app, client.email);
  await request(app)
    .patch('/api/auth/notification-preferences')
    .set('Cookie', auth.cookie)
    .send({ workflowNotifications: true })
    .expect(403);
  await request(app).get('/api/dashboard/onboarding').set(authHeader(auth)).expect(403);
  const admin = (await db.select().from(users).where(eq(users.email, 'admin@example.com')))[0]!;
  const checklist = await onboardingForAdmin(admin);
  expect(checklist.completed).toBe(4);
  expect(checklist.steps.find((s) => s.key === 'acceptance')?.complete).toBe(false);
  await expect(onboardingForAdmin(staff)).rejects.toThrow();
});
