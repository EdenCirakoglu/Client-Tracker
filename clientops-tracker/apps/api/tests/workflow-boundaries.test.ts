import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import {
  deliveryEvents,
  deliveryRevisions,
  progressSummaries,
  releases,
  ticketEvents,
  users,
} from '../src/db/schema';
import { decideDelivery } from '../src/services/delivery.service';
import { decideScope } from '../src/services/scope.service';
import { generateSummary, publishSummary } from '../src/services/summary.service';
import type { AuthenticatedUser } from '../src/types/auth';
import { authHeader, loginSession, type SessionAuth } from './helpers/auth';

const app = createApp();
let staff: SessionAuth, client: SessionAuth, outsider: SessionAuth;
let actor: AuthenticatedUser, developer: AuthenticatedUser;
let projectId: string, ticketId: string, revisionId: string, scopeId: string;
beforeAll(async () => {
  await seedDatabase();
  staff = await loginSession(app, 'developer@example.com');
  client = await loginSession(app, 'client@example.com');
  outsider = await loginSession(app, 'bluewave@example.com');
  actor = (await request(app).get('/api/auth/me').set(authHeader(client))).body.data;
  developer = (await request(app).get('/api/auth/me').set(authHeader(staff))).body.data;
  projectId = (await request(app).get('/api/projects').set(authHeader(client))).body.data[0].id;
  ticketId = (
    await request(app)
      .post('/api/tickets')
      .set(authHeader(client))
      .send({
        projectId,
        title: 'Fictional acceptance boundary',
        description: 'Verify client decision and reporting boundaries.',
        category: 'FEATURE_REQUEST',
      })
      .expect(201)
  ).body.data.id;
  revisionId = (
    await request(app)
      .post(`/api/tickets/${ticketId}/delivery`)
      .set(authHeader(staff))
      .send({
        expectedRevision: 0,
        reviewerId: actor.id,
        outcome: 'The agreed shipment reference is displayed accurately.',
      })
      .expect(201)
  ).body.data.revisions[0].id;
  scopeId = (
    await request(app)
      .post(`/api/tickets/${ticketId}/scope`)
      .set(authHeader(staff))
      .send({
        expectedRevision: 0,
        approverId: actor.id,
        scope: 'Show the shipment reference beside the result.',
        exclusions: 'No historical imports.',
        estimate: 'One day, estimate only.',
        deliveryImplications: 'Deliver after the reviewed outcome is agreed.',
      })
      .expect(201)
  ).body.data[0].id;
});
afterAll(() => pool.end());

it.each(['DISABLED', 'role', 'organisation'] as const)(
  'rechecks %s changes between authentication and a decision transaction',
  async (change) => {
    const other = (await request(app).get('/api/auth/me').set(authHeader(outsider))).body.data;
    try {
      await db
        .update(users)
        .set(
          change === 'DISABLED'
            ? { accountStatus: 'DISABLED' }
            : change === 'role'
              ? { role: 'DEVELOPER', clientId: null }
              : { clientId: other.clientId },
        )
        .where(eq(users.id, actor.id));
      await expect(
        decideDelivery(actor, ticketId, revisionId, { decision: 'AGREED', feedback: '' }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' });
      await expect(
        decideScope(actor, ticketId, scopeId, { decision: 'APPROVED', feedback: '' }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' });
      expect(
        (await db.select().from(deliveryRevisions).where(eq(deliveryRevisions.id, revisionId)))[0]!
          .state,
      ).toBe('PROPOSED');
    } finally {
      await db
        .update(users)
        .set({ accountStatus: 'ACTIVE', role: 'CLIENT', clientId: actor.clientId })
        .where(eq(users.id, actor.id));
    }
  },
);

it('concurrent contradictory delivery and scope decisions persist only one outcome', async () => {
  const delivery = await Promise.allSettled([
    decideDelivery(actor, ticketId, revisionId, { decision: 'AGREED', feedback: '' }),
    decideDelivery(actor, ticketId, revisionId, {
      decision: 'CHANGES_REQUESTED',
      feedback: 'Please include the older shipment records.',
    }),
  ]);
  expect(delivery.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(delivery.filter((r) => r.status === 'rejected').map((r) => r.reason.statusCode)).toEqual([
    409,
  ]);
  expect(
    await db.select().from(deliveryEvents).where(eq(deliveryEvents.revisionId, revisionId)),
  ).toHaveLength(2);
  const scope = await Promise.allSettled([
    decideScope(actor, ticketId, scopeId, { decision: 'APPROVED', feedback: '' }),
    decideScope(actor, ticketId, scopeId, {
      decision: 'REJECTED',
      feedback: 'This proposal needs a different estimate.',
    }),
  ]);
  expect(scope.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(scope.filter((r) => r.status === 'rejected').map((r) => r.reason.statusCode)).toEqual([
    409,
  ]);
});

it('uses inclusive-start/exclusive-end UTC events and preserves published corrections separately', async () => {
  const start = new Date('2025-12-29T00:00:00Z'),
    end = new Date('2026-01-05T00:00:00Z');
  for (const [index, when] of [
    new Date(start.getTime() - 1),
    start,
    new Date(end.getTime() - 1),
    end,
  ].entries()) {
    await db.insert(ticketEvents).values({
      ticketId,
      actorId: developer.id,
      eventType: 'STATUS_CHANGED',
      toValue: 'RESOLVED',
      createdAt: when,
    });
    await db.insert(releases).values({
      projectId,
      version: `boundary-${index}`,
      title: `Boundary release ${index}`,
      createdAt: when,
    });
  }
  await db.insert(deliveryEvents).values({
    revisionId,
    actorId: actor.id,
    actorName: actor.name,
    action: 'ACCEPTED',
    createdAt: start,
  });
  const input = { clientId: actor.clientId!, weekStart: '2025-12-29', upcoming: [], blocked: [] };
  const draft = await generateSummary(developer, input);
  expect(draft.periodEnd.toISOString()).toBe(end.toISOString());
  expect(draft.sections.find((s) => s.key === 'resolved')!.items).toHaveLength(2);
  expect(draft.sections.find((s) => s.key === 'releases')!.items.map((s) => s.title)).toEqual([
    'boundary-2 - Boundary release 2',
    'boundary-1 - Boundary release 1',
  ]);
  expect(draft.sections.find((s) => s.key === 'accepted')!.items).toHaveLength(1);
  await publishSummary(developer, draft.id);
  const original = (
    await db.select().from(progressSummaries).where(eq(progressSummaries.id, draft.id))
  )[0];
  const correction = await generateSummary(developer, {
    ...input,
    upcoming: [{ ticketId, note: 'Corrected timing recorded for the next delivery.' }],
  });
  await request(app).get(`/api/summaries/${correction.id}`).set(authHeader(client)).expect(404);
  await publishSummary(developer, correction.id);
  expect(correction.id).not.toBe(draft.id);
  expect(
    (await db.select().from(progressSummaries).where(eq(progressSummaries.id, draft.id)))[0],
  ).toEqual(original);
});
