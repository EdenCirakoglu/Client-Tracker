import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';
import { deliveryDateBounds, deliveryViews } from '../src/services/delivery-plan.service';
import { authHeader, loginSession, type SessionAuth } from './helpers/auth';

const app = createApp();
let admin: SessionAuth, developer: SessionAuth, client: SessionAuth, other: SessionAuth;
let projectId: string,
  otherProjectId: string,
  releaseId: string,
  reviewerId: string,
  ownerId: string,
  clientId: string;
const { today, through } = deliveryDateBounds();
const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 86400000)
  .toISOString()
  .slice(0, 10);
const outcome = 'An archived shipment reference returns the original order and archived label.';
const plan = (view = 'followup', session = client, extra = '') =>
  request(app).get(`/api/dashboard/delivery?view=${view}&${extra}`).set(authHeader(session));
const proposal = (id: string, targetDate: string | null, expectedRevision = 0, owner = ownerId) =>
  request(app)
    .post(`/api/tickets/${id}/delivery`)
    .set(authHeader(developer))
    .send({ reviewerId, ownerId: owner, targetDate, outcome, expectedRevision });
const decide = (id: string, revision: string, decision = 'AGREED') =>
  request(app)
    .post(`/api/tickets/${id}/delivery/${revision}/decision`)
    .set(authHeader(client))
    .send({ decision });
async function record(targetDate: string | null) {
  const ticket = await request(app)
    .post('/api/tickets')
    .set(authHeader(client))
    .send({
      projectId,
      title: 'Archived shipment delivery planning',
      description: outcome,
      category: 'FEATURE_REQUEST',
    })
    .expect(201);
  const id = ticket.body.data.id as string;
  const proposed = await proposal(id, targetDate).expect(201);
  return { id, revision: proposed.body.data.revisions[0].id as string };
}

describe('Delivery planning and factual follow-up', () => {
  beforeAll(async () => {
    await seedDatabase();
    admin = await loginSession(app, 'admin@example.com');
    developer = await loginSession(app, 'developer@example.com');
    client = await loginSession(app, 'client@example.com');
    other = await loginSession(app, 'bluewave@example.com');
    const me = (await request(app).get('/api/auth/me').set(authHeader(client))).body.data;
    reviewerId = me.id;
    clientId = me.clientId;
    ownerId = (await request(app).get('/api/auth/me').set(authHeader(developer))).body.data.id;
    const versions = (await request(app).get('/api/releases').set(authHeader(admin))).body.data;
    const own = versions.find(
      (r: { project: { clientId: string } }) => r.project.clientId === clientId,
    );
    projectId = own.projectId;
    releaseId = own.id;
    otherProjectId = versions.find(
      (r: { projectId: string }) => r.projectId !== projectId,
    ).projectId;
  });
  afterAll(() => pool.end());

  it('uses calendar UTC bounds, including month and year rollover', () => {
    expect(deliveryDateBounds(new Date('2026-12-29T23:59:59Z'))).toEqual({
      today: '2026-12-29',
      through: '2027-01-05',
    });
  });

  it('counts only agreed past targets as overdue, not proposals, undated work or delivered work', async () => {
    const past = await record(yesterday);
    expect((await plan('overdue').expect(200)).body.data.total).toBe(0);
    await decide(past.id, past.revision).expect(200);
    const late = (await plan('overdue').expect(200)).body.data;
    expect(late.total).toBe(1);
    expect(late.items[0]).toMatchObject({
      ticketId: past.id,
      targetDate: yesterday,
      reason: 'Agreed target date has passed',
    });
    const undated = await record(null);
    await decide(undated.id, undated.revision).expect(200);
    expect((await plan('overdue').expect(200)).body.data.total).toBe(1);
    await request(app)
      .post(`/api/tickets/${past.id}/delivery/${past.revision}/request-acceptance`)
      .set(authHeader(developer))
      .send({
        releaseId,
        deliveryNotes: 'Archived shipment search is available for client verification.',
      })
      .expect(200);
    expect((await plan('overdue').expect(200)).body.data.total).toBe(0);
    expect((await plan('acceptance').expect(200)).body.data.items[0]).toMatchObject({
      ticketId: past.id,
      yourDecision: true,
    });
    await decide(past.id, past.revision, 'ACCEPTED').expect(200);
    expect(
      (await plan('followup').expect(200)).body.data.items.some(
        (i: { ticketId: string }) => i.ticketId === past.id,
      ),
    ).toBe(false);
    expect(
      (await plan('all').expect(200)).body.data.items.some(
        (i: { ticketId: string }) => i.ticketId === past.id,
      ),
    ).toBe(true);
  });

  it('includes today, excludes the seven-day boundary, and requires new agreement after a date change', async () => {
    const current = await record(today);
    await decide(current.id, current.revision).expect(200);
    const later = await record(through);
    await decide(later.id, later.revision).expect(200);
    expect(
      (await plan('upcoming').expect(200)).body.data.items.map(
        (i: { ticketId: string }) => i.ticketId,
      ),
    ).toEqual([current.id]);
    const revised = (await proposal(current.id, yesterday, 1).expect(201)).body.data.revisions;
    expect(revised[0]).toMatchObject({ state: 'PROPOSED', targetDate: yesterday, ownerId });
    expect(revised[1]).toMatchObject({ state: 'AGREED', targetDate: today });
    expect((await plan('upcoming').expect(200)).body.data.total).toBe(0);
    expect((await plan('overdue').expect(200)).body.data.total).toBe(0);
    await decide(current.id, current.revision).expect(409);
    await decide(current.id, revised[0].id).expect(200);
    expect((await plan('overdue').expect(200)).body.data.total).toBe(1);
    const exported = await request(app)
      .get(`/api/tickets/${current.id}/delivery/export`)
      .set(authHeader(client))
      .expect(200);
    expect(exported.body.data.content).toContain(`Target date (UTC): ${yesterday}`);
    expect(exported.body.data.content).toContain('Delivery owner:');
  });

  it('rejects invalid dates and non-internal or disabled owners, and protects owner lookup', async () => {
    const current = await record(null);
    await proposal(current.id, '2026-02-30', 1).expect(400);
    await proposal(current.id, '0000-01-01', 1).expect(400);
    await proposal(current.id, today, 1, reviewerId).expect(400);
    await db.update(users).set({ accountStatus: 'DISABLED' }).where(eq(users.id, ownerId));
    try {
      await request(app)
        .post(`/api/tickets/${current.id}/delivery`)
        .set(authHeader(admin))
        .send({ outcome, reviewerId, ownerId, targetDate: today, expectedRevision: 1 })
        .expect(400);
    } finally {
      await db.update(users).set({ accountStatus: 'ACTIVE' }).where(eq(users.id, ownerId));
    }
    await request(app)
      .get(`/api/tickets/${current.id}/delivery/owners`)
      .set(authHeader(client))
      .expect(403);
    const owners = await request(app)
      .get(`/api/tickets/${current.id}/delivery/owners`)
      .set(authHeader(admin))
      .expect(200);
    expect(owners.body.data.every((p: { id: string }) => p.id !== reviewerId)).toBe(true);
    expect(JSON.stringify(owners.body)).not.toMatch(/@example|password|session/i);
  });

  it('isolates both organisations, rejects foreign project links and bounds query inputs', async () => {
    await request(app).get('/api/dashboard/delivery').expect(401);
    const otherMe = (await request(app).get('/api/auth/me').set(authHeader(other))).body.data;
    const otherTicket = (
      await request(app)
        .post('/api/tickets')
        .set(authHeader(other))
        .send({
          projectId: otherProjectId,
          title: 'Reporting access for Bluewave',
          description: 'Return the agreed report fields in the account overview.',
          category: 'SUPPORT',
        })
        .expect(201)
    ).body.data;
    await request(app)
      .post(`/api/tickets/${otherTicket.id}/delivery`)
      .set(authHeader(admin))
      .send({
        outcome: 'Return the agreed report fields in the account overview.',
        reviewerId: otherMe.id,
        expectedRevision: 0,
      })
      .expect(201);
    const outside = await plan('all', other).expect(200);
    expect(outside.body.data.total).toBe(1);
    expect(outside.body.data.items[0].ticketId).toBe(otherTicket.id);
    expect(outside.body.data.counts).toMatchObject({
      all: 1,
      followup: 1,
      agreement: 1,
      overdue: 0,
      upcoming: 0,
      scope: 0,
    });
    await plan('all', other, `projectId=${projectId}`).expect(404);
    await plan('all', client, `projectId=${otherProjectId}`).expect(404);
    await plan('unknown').expect(400);
    await plan('all', client, 'limit=51').expect(400);
    await plan('all', client, 'page=0').expect(400);
    const own = await plan('all').expect(200);
    expect(
      own.body.data.items.some((i: { ticketId: string }) => i.ticketId === otherTicket.id),
    ).toBe(false);
    expect(JSON.stringify(own.body)).not.toMatch(
      /@example|passwordHash|isInternal|suggestedNextAction/,
    );
  });

  it('keeps full-scope counts consistent with filters and pagination with no duplicate rows', async () => {
    const first = (await plan('all', client, 'limit=1').expect(200)).body.data;
    const second = (await plan('all', client, 'limit=1&page=2').expect(200)).body.data;
    expect(first.total).toBeGreaterThan(1);
    expect(first.counts).toEqual(second.counts);
    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect((await plan('all', client, 'limit=1').expect(200)).body.data.items[0].id).toBe(
      first.items[0].id,
    );
    for (const view of deliveryViews) {
      const filtered = (await plan(view).expect(200)).body.data;
      expect(filtered.total).toBe(first.counts[view]);
      expect(filtered.items).toHaveLength(filtered.total);
    }
  });

  it('shows only the latest pending scope and snapshots real agreed dates into client-safe summaries', async () => {
    const current = await record(today);
    await decide(current.id, current.revision).expect(200);
    const scope = await request(app)
      .post(`/api/tickets/${current.id}/scope`)
      .set(authHeader(admin))
      .send({
        expectedRevision: 0,
        approverId: reviewerId,
        scope: outcome,
        exclusions: 'No bulk export.',
        estimate: 'Two days; estimate only.',
        deliveryImplications: 'Deliver after archived examples are confirmed.',
      })
      .expect(201);
    expect((await plan('scope').expect(200)).body.data.items[0]).toMatchObject({
      ticketId: current.id,
      yourDecision: true,
      source: 'scope',
    });
    expect((await plan('scope', admin).expect(200)).body.data.items[0].yourDecision).toBe(false);
    await request(app)
      .post(`/api/tickets/${current.id}/scope/${scope.body.data[0].id}/decision`)
      .set(authHeader(client))
      .send({ decision: 'APPROVED' })
      .expect(200);
    expect((await plan('scope').expect(200)).body.data.total).toBe(0);
    const summary = await request(app)
      .post('/api/summaries')
      .set(authHeader(admin))
      .send({ clientId, weekStart: today })
      .expect(201);
    const sections = summary.body.data.sections;
    expect(
      sections.find((s: { key: string }) => s.key === 'upcoming-delivery').items[0],
    ).toMatchObject({ href: `/tickets/${current.id}#delivery` });
    expect(sections.find((s: { key: string }) => s.key === 'overdue-delivery').items).toHaveLength(
      1,
    );
    await request(app)
      .get(`/api/summaries/${summary.body.data.id}`)
      .set(authHeader(other))
      .expect(404);
  });
  it('prioritises the named client decision without giving other contacts approval authority', async () => {
    const current = await record(today);
    const [template] = await db.select().from(users).where(eq(users.id, reviewerId));
    await db.insert(users).values({
      name: 'Additional Northstar Contact',
      email: 'planning-contact@example.com',
      passwordHash: template!.passwordHash,
      clientId,
      role: 'CLIENT',
    });
    const contact = await loginSession(app, 'planning-contact@example.com');
    const designated = (await plan().expect(200)).body.data.items;
    expect(designated[0].yourDecision).toBe(true);
    const colleague = (await plan('followup', contact).expect(200)).body.data.items;
    expect(colleague.every((i: { yourDecision: boolean }) => !i.yourDecision)).toBe(true);
    await request(app)
      .post(`/api/tickets/${current.id}/delivery/${current.revision}/decision`)
      .set(authHeader(contact))
      .send({ decision: 'AGREED' })
      .expect(403);
  });
});
