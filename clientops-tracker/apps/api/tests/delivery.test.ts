import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { deliveryEvents, deliveryRevisions, tickets, users } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';
import { authHeader, loginSession, type SessionAuth } from './helpers/auth';

const app = createApp();
let admin: SessionAuth, developer: SessionAuth, client: SessionAuth, outsider: SessionAuth;
let projectId: string,
  releaseId: string,
  otherReleaseId: string,
  reviewerId: string,
  clientId: string;

describe('Request-to-acceptance delivery record', () => {
  beforeAll(async () => {
    await seedDatabase();
    admin = await loginSession(app, 'admin@example.com');
    developer = await loginSession(app, 'developer@example.com');
    client = await loginSession(app, 'client@example.com');
    outsider = await loginSession(app, 'bluewave@example.com');
    const me = await request(app).get('/api/auth/me').set(authHeader(client));
    reviewerId = me.body.data.id;
    clientId = me.body.data.clientId;
    const versions = await request(app).get('/api/releases').set(authHeader(admin));
    const own = versions.body.data.find(
      (r: { project: { clientId: string } }) => r.project.clientId === clientId,
    );
    projectId = own.projectId;
    releaseId = own.id;
    otherReleaseId = versions.body.data.find((r: { id: string }) => r.id !== releaseId).id;
  });
  afterAll(async () => {
    await pool.end();
  });

  async function newTicket() {
    const response = await request(app)
      .post('/api/tickets')
      .set(authHeader(client))
      .send({
        projectId,
        title: 'Archived shipment search includes older orders',
        description: 'Please include archived orders when searching by shipment reference.',
        category: 'FEATURE_REQUEST',
      })
      .expect(201);
    return response.body.data.id as string;
  }
  async function propose(id: string, revision = 0) {
    return request(app)
      .post(`/api/tickets/${id}/delivery`)
      .set(authHeader(developer))
      .send({
        reviewerId,
        expectedRevision: revision,
        outcome: 'Searching an archived shipment reference returns its order and archived label.',
      })
      .expect(201);
  }
  const decide = (
    id: string,
    revision: string,
    decision: string,
    session = client,
    feedback = '',
  ) =>
    request(app)
      .post(`/api/tickets/${id}/delivery/${revision}/decision`)
      .set(authHeader(session))
      .send({ decision, feedback });
  const deliver = (id: string, revision: string, version = releaseId) =>
    request(app)
      .post(`/api/tickets/${id}/delivery/${revision}/request-acceptance`)
      .set(authHeader(developer))
      .send({
        releaseId: version,
        deliveryNotes:
          'Archived shipment lookup is now included. Search a known archived reference to verify.',
      });

  it('records agreement, release delivery and acceptance independently of resolution', async () => {
    const id = await newTicket();
    expect(
      (await request(app).get(`/api/tickets/${id}/delivery`).set(authHeader(client)).expect(200))
        .body.data.revisions,
    ).toEqual([]);
    const proposed = (await propose(id)).body.data.revisions[0];
    await deliver(id, proposed.id).expect(409);
    await decide(id, proposed.id, 'ACCEPTED').expect(409);
    await decide(id, proposed.id, 'AGREED').expect(200);
    await deliver(id, proposed.id).expect(200);
    const response = await decide(
      id,
      proposed.id,
      'ACCEPTED',
      client,
      'Archived references now return the correct orders.',
    ).expect(200);
    expect(response.body.data.revisions[0].state).toBe('ACCEPTED');
    expect(response.body.data.revisions[0].events.map((e: { action: string }) => e.action)).toEqual(
      ['PROPOSED', 'AGREED', 'ACCEPTANCE_REQUESTED', 'ACCEPTED'],
    );
    const ticket = await request(app).get(`/api/tickets/${id}`).set(authHeader(client)).expect(200);
    expect(ticket.body.data.status).toBe('OPEN');
    expect(ticket.body.data.resolvedAt).toBeNull();
  });

  it('enforces tenant privacy for records, exports, reviewers and direct decisions', async () => {
    const id = await newTicket();
    const revision = (await propose(id)).body.data.revisions[0];
    await request(app).get(`/api/tickets/${id}/delivery`).set(authHeader(outsider)).expect(404);
    await request(app)
      .get(`/api/tickets/${id}/delivery/export`)
      .set(authHeader(outsider))
      .expect(404);
    await request(app)
      .get(`/api/tickets/${id}/delivery/reviewers`)
      .set(authHeader(client))
      .expect(403);
    await decide(id, revision.id, 'AGREED', outsider).expect(404);
    await decide(id, revision.id, 'AGREED', admin).expect(403);
    await request(app)
      .post(`/api/tickets/${id}/delivery`)
      .set(authHeader(client))
      .send({ expectedRevision: 0, reviewerId, outcome: 'Bypass client outcome creation.' })
      .expect(403);
    await request(app)
      .post(`/api/tickets/${id}/delivery/${revision.id}/request-acceptance`)
      .set(authHeader(client))
      .send({ releaseId, deliveryNotes: 'Client cannot claim delivery.' })
      .expect(403);
    await request(app).get(`/api/tickets/${id}/delivery`).expect(401);
    await request(app)
      .post(`/api/tickets/${id}/delivery`)
      .set('Cookie', admin.cookie)
      .send({})
      .expect(403);
  });

  it('rejects an unrelated reviewer or release and validates feedback', async () => {
    const id = await newTicket();
    const other = await request(app).get('/api/auth/me').set(authHeader(outsider));
    await request(app)
      .post(`/api/tickets/${id}/delivery`)
      .set(authHeader(admin))
      .send({
        expectedRevision: 0,
        reviewerId: other.body.data.id,
        outcome: 'Must not assign another organisation.',
      })
      .expect(400);
    const revision = (await propose(id)).body.data.revisions[0];
    await decide(id, revision.id, 'CHANGES_REQUESTED').expect(400);
    await decide(id, revision.id, 'AGREED').expect(200);
    await deliver(id, revision.id, otherReleaseId).expect(400);
  });

  it('allows only the designated reviewer even within the same organisation', async () => {
    const [template] = await db.select().from(users).where(eq(users.id, reviewerId));
    await db.insert(users).values({
      name: 'Second fictional contact',
      email: 'second-contact@example.com',
      passwordHash: template!.passwordHash,
      role: 'CLIENT',
      clientId,
    });
    const second = await loginSession(app, 'second-contact@example.com');
    const id = await newTicket();
    const revision = (await propose(id)).body.data.revisions[0];
    await request(app).get(`/api/tickets/${id}/delivery`).set(authHeader(second)).expect(200);
    await decide(id, revision.id, 'AGREED', second).expect(403);
  });

  it('keeps feedback and prior approvals when a new revision requires renewed agreement', async () => {
    const id = await newTicket();
    const first = (await propose(id)).body.data.revisions[0];
    await decide(id, first.id, 'AGREED').expect(200);
    await deliver(id, first.id).expect(200);
    await decide(
      id,
      first.id,
      'CHANGES_REQUESTED',
      client,
      'Archived orders from the previous year are still missing.',
    ).expect(200);
    const response = await propose(id, 1);
    expect(response.body.data.revisions.map((r: { state: string }) => r.state)).toEqual([
      'PROPOSED',
      'CHANGES_REQUESTED',
    ]);
    expect(response.body.data.revisions[1].events.at(-1).feedback).toContain('previous year');
    await decide(id, first.id, 'ACCEPTED').expect(409);
    await deliver(id, response.body.data.revisions[0].id).expect(409);
  });

  it('serializes concurrent decisions and makes identical delivery/acceptance retries idempotent', async () => {
    const id = await newTicket();
    const revision = (await propose(id)).body.data.revisions[0];
    await decide(id, revision.id, 'AGREED').expect(200);
    const deliveries = await Promise.all([deliver(id, revision.id), deliver(id, revision.id)]);
    expect(deliveries.map((r) => r.status)).toEqual([200, 200]);
    const decisions = await Promise.all([
      decide(id, revision.id, 'ACCEPTED'),
      decide(id, revision.id, 'ACCEPTED'),
    ]);
    expect(decisions.map((r) => r.status)).toEqual([200, 200]);
    const events = await db
      .select()
      .from(deliveryEvents)
      .where(eq(deliveryEvents.revisionId, revision.id));
    expect(events.filter((e) => e.action === 'ACCEPTED')).toHaveLength(1);
    expect(events.filter((e) => e.action === 'ACCEPTANCE_REQUESTED')).toHaveLength(1);
    await decide(
      id,
      revision.id,
      'CHANGES_REQUESTED',
      client,
      'Contradictory late feedback is a new revision.',
    ).expect(409);
  });

  it('rejects stale writes when staff submit concurrent proposals', async () => {
    const id = await newTicket();
    const body = {
      reviewerId,
      expectedRevision: 0,
      outcome: 'Return archived orders with an explicit archived label.',
    };
    const responses = await Promise.all(
      [admin, developer].map((auth) =>
        request(app).post(`/api/tickets/${id}/delivery`).set(authHeader(auth)).send(body),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await db.select().from(deliveryRevisions).where(eq(deliveryRevisions.ticketId, id)),
    ).toHaveLength(1);
  });

  it('exports only client-safe data and preserves the original request after ticket edits', async () => {
    const id = await newTicket();
    await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set(authHeader(developer))
      .send({ isInternal: true, body: 'INTERNAL-ONLY diagnostic information must not appear.' })
      .expect(201);
    await request(app)
      .patch(`/api/tickets/${id}`)
      .set(authHeader(developer))
      .send({ description: 'Updated clarification, not the original request.' })
      .expect(200);
    await propose(id);
    const own = await request(app)
      .get(`/api/tickets/${id}/delivery/export`)
      .set(authHeader(client))
      .expect(200);
    const staff = await request(app)
      .get(`/api/tickets/${id}/delivery/export`)
      .set(authHeader(admin))
      .expect(200);
    expect(own.body.data).toEqual(staff.body.data);
    expect(own.body.data.content).toContain('Please include archived orders');
    expect(own.body.data.content).not.toMatch(
      /INTERNAL-ONLY|triage|passwordHash|@example|Updated clarification/,
    );
    expect(own.headers['cache-control']).toBe('no-store');
  });

  it('revokes decision access after a reviewer changes organisation', async () => {
    const id = await newTicket();
    const revision = (await propose(id)).body.data.revisions[0];
    const other = await request(app).get('/api/auth/me').set(authHeader(outsider));
    try {
      await db
        .update(users)
        .set({ clientId: other.body.data.clientId })
        .where(eq(users.id, reviewerId));
      await decide(id, revision.id, 'AGREED').expect(404);
    } finally {
      await db.update(users).set({ clientId }).where(eq(users.id, reviewerId));
    }
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    expect(ticket!.status).toBe('OPEN');
  });
});
