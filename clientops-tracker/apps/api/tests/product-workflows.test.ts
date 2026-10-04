import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { progressSummaries, scopeProposals } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';
import { authHeader, loginSession, type SessionAuth } from './helpers/auth';

const app = createApp();
let admin: SessionAuth, developer: SessionAuth, client: SessionAuth, outsider: SessionAuth;
let clientId: string, projectId: string, reviewerId: string, otherTicketId: string;
const weekStart = new Date().toISOString().slice(0, 10);
const proposal = {
  scope: 'Include archived shipment references in the search results.',
  exclusions: 'No bulk export or historical data cleanup.',
  estimate: '2-3 engineering days; estimate only.',
  deliveryImplications:
    'Schedule after the client confirms an archived reference for verification.',
  externalReference: 'DEMO-QUOTE-104',
};
describe('Scope approvals and client progress summaries', () => {
  beforeAll(async () => {
    await seedDatabase();
    admin = await loginSession(app, 'admin@example.com');
    developer = await loginSession(app, 'developer@example.com');
    client = await loginSession(app, 'client@example.com');
    outsider = await loginSession(app, 'bluewave@example.com');
    const me = await request(app).get('/api/auth/me').set(authHeader(client));
    reviewerId = me.body.data.id;
    clientId = me.body.data.clientId;
    const projects = await request(app).get('/api/projects').set(authHeader(client));
    projectId = projects.body.data[0].id;
    const otherTickets = await request(app).get('/api/tickets').set(authHeader(outsider));
    otherTicketId = otherTickets.body.data[0].id;
  });
  afterAll(async () => {
    await pool.end();
  });
  async function createTicket(category = 'FEATURE_REQUEST') {
    const response = await request(app)
      .post('/api/tickets')
      .set(authHeader(client))
      .send({
        projectId,
        title: 'Archived shipment search refinement',
        description: 'Return archived shipments alongside active shipment records.',
        category,
      })
      .expect(201);
    return response.body.data.id as string;
  }
  const propose = (id: string, expectedRevision = 0) =>
    request(app)
      .post(`/api/tickets/${id}/scope`)
      .set(authHeader(developer))
      .send({ ...proposal, expectedRevision, approverId: reviewerId });
  const decide = (
    id: string,
    revision: string,
    decision = 'APPROVED',
    session = client,
    feedback = '',
  ) =>
    request(app)
      .post(`/api/tickets/${id}/scope/${revision}/decision`)
      .set(authHeader(session))
      .send({ decision, feedback });

  it('binds approval to a specific immutable proposal revision', async () => {
    const id = await createTicket();
    const first = (await propose(id).expect(201)).body.data[0];
    await decide(id, first.id).expect(200);
    const response = await propose(id, 1).expect(201);
    expect(response.body.data.map((p: { state: string }) => p.state)).toEqual([
      'PROPOSED',
      'APPROVED',
    ]);
    expect(response.body.data[1]).toMatchObject(proposal);
    await decide(
      id,
      first.id,
      'REJECTED',
      client,
      'This decision targets a superseded proposal.',
    ).expect(409);
    const ticket = await request(app).get(`/api/tickets/${id}`).set(authHeader(client));
    expect(ticket.body.data.status).toBe('OPEN');
    expect(ticket.body.data.priority).toBe('MEDIUM');
  });
  it('serializes approval retries without overwriting the original decision timestamp', async () => {
    const id = await createTicket();
    const revision = (await propose(id).expect(201)).body.data[0];
    const responses = await Promise.all([decide(id, revision.id), decide(id, revision.id)]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(responses[0]!.body.data[0].decidedAt).toBe(responses[1]!.body.data[0].decidedAt);
    expect(
      await db.select().from(scopeProposals).where(eq(scopeProposals.ticketId, id)),
    ).toHaveLength(1);
    await decide(
      id,
      revision.id,
      'CHANGES_REQUESTED',
      client,
      'Cannot overwrite approval in place.',
    ).expect(409);
  });
  it('enforces client scope, approver role, feature category and meaningful rejection feedback', async () => {
    const bug = await createTicket('BUG');
    await propose(bug).expect(400);
    const id = await createTicket();
    const revision = (await propose(id).expect(201)).body.data[0];
    await request(app).get(`/api/tickets/${id}/scope`).set(authHeader(outsider)).expect(404);
    await decide(id, revision.id, 'APPROVED', outsider).expect(404);
    await decide(id, revision.id, 'APPROVED', admin).expect(403);
    await decide(id, revision.id, 'REJECTED').expect(400);
    await decide(
      id,
      revision.id,
      'REJECTED',
      client,
      'This is not a priority for the current delivery.',
    ).expect(200);
    await request(app)
      .post(`/api/tickets/${id}/scope`)
      .set(authHeader(client))
      .send({ ...proposal, expectedRevision: 1, approverId: reviewerId })
      .expect(403);
  });
  it('requires renewed approval after changes are requested', async () => {
    const id = await createTicket();
    const first = (await propose(id).expect(201)).body.data[0];
    await decide(
      id,
      first.id,
      'CHANGES_REQUESTED',
      client,
      'Please explicitly exclude exporting archived documents.',
    ).expect(200);
    const response = await propose(id, 1).expect(201);
    expect(response.body.data[0].state).toBe('PROPOSED');
    expect(response.body.data[1].feedback).toContain('exclude exporting');
  });
  it('previews real records without internal data and publishes an immutable client-safe snapshot', async () => {
    const id = await createTicket();
    await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set(authHeader(developer))
      .send({ body: 'DO_NOT_PUBLISH internal operational diagnostics.', isInternal: true })
      .expect(201);
    await request(app)
      .patch(`/api/tickets/${id}`)
      .set(authHeader(developer))
      .send({ status: 'RESOLVED' })
      .expect(200);
    await request(app)
      .patch(`/api/tickets/${id}`)
      .set(authHeader(developer))
      .send({ status: 'WAITING_FOR_CLIENT' })
      .expect(200);
    const first = (await propose(id).expect(201)).body.data[0];
    await decide(id, first.id).expect(200);
    await propose(id, 1).expect(201);
    await request(app)
      .post('/api/releases')
      .set(authHeader(admin))
      .send({
        projectId,
        version: 'demo-summary-1',
        title: 'Archived search update',
        notes: 'Improved archived shipment search.',
      })
      .expect(201);
    const draft = (
      await request(app)
        .post('/api/summaries')
        .set(authHeader(developer))
        .send({
          clientId,
          weekStart,
          upcoming: [
            { ticketId: id, note: 'Verify the archived reference with the client next week.' },
          ],
          blocked: [
            { ticketId: id, note: 'Awaiting an example shipment reference from the client.' },
          ],
        })
        .expect(201)
    ).body.data;
    expect(JSON.stringify(draft)).not.toMatch(
      /DO_NOT_PUBLISH|Bluewave|Investigate unusual|passwordHash|triageSuggestion/,
    );
    const sections = Object.fromEntries(
      draft.sections.map((s: { key: string; items: unknown[] }) => [s.key, s.items]),
    );
    expect(sections.resolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: `/tickets/${id}`,
          detail: expect.stringContaining('Waiting for client'),
        }),
      ]),
    );
    expect(
      sections.approvals.filter((s: { href: string }) => s.href === `/tickets/${id}`),
    ).toHaveLength(1);
    expect(
      sections.approvals.find((s: { href: string }) => s.href === `/tickets/${id}`).detail,
    ).toContain('revision 2');
    expect(sections.upcoming).toHaveLength(1);
    await request(app).get(`/api/summaries/${draft.id}`).set(authHeader(client)).expect(404);
    await request(app)
      .post(`/api/summaries/${draft.id}/publish`)
      .set(authHeader(client))
      .expect(403);
    const published = await request(app)
      .post(`/api/summaries/${draft.id}/publish`)
      .set(authHeader(developer))
      .expect(200);
    const replay = await request(app)
      .post(`/api/summaries/${draft.id}/publish`)
      .set(authHeader(developer))
      .expect(200);
    expect(published.body.data.publishedAt).toBe(replay.body.data.publishedAt);
    await request(app)
      .patch(`/api/tickets/${id}`)
      .set(authHeader(developer))
      .send({ title: 'Later change does not rewrite the published summary.' })
      .expect(200);
    const visible = await request(app)
      .get(`/api/summaries/${draft.id}`)
      .set(authHeader(client))
      .expect(200);
    expect(visible.body.data.sections).toEqual(draft.sections);
    await request(app).get(`/api/summaries/${draft.id}`).set(authHeader(outsider)).expect(404);
    expect(
      (await request(app).get('/api/summaries').set(authHeader(outsider))).body.data.items,
    ).toEqual([]);
    expect(
      (await request(app).get('/api/summaries').set(authHeader(client))).body.data.items.map(
        (s: { id: string }) => s.id,
      ),
    ).toContain(draft.id);
  });
  it('rejects foreign supporting records, invalid periods and client-authored summaries', async () => {
    await request(app)
      .post('/api/summaries')
      .set(authHeader(admin))
      .send({
        clientId,
        weekStart,
        blocked: [
          { ticketId: otherTicketId, note: 'Cannot publish a ticket belonging to another client.' },
        ],
      })
      .expect(400);
    await request(app)
      .post('/api/summaries')
      .set(authHeader(client))
      .send({ clientId, weekStart })
      .expect(403);
    await request(app)
      .post('/api/summaries')
      .set(authHeader(admin))
      .send({ clientId, weekStart: '2099-01-01' })
      .expect(400);
    await request(app).get('/api/summaries?page=0').set(authHeader(client)).expect(400);
  });
  it('bounds summary pagination without exposing drafts to clients', async () => {
    const rows = Array.from({ length: 23 }, () => ({
      clientId,
      clientName: 'Northstar Logistics (Demo)',
      periodStart: new Date(),
      periodEnd: new Date(),
      sections: [],
      createdBy: 'Demo Developer',
    }));
    await db.insert(progressSummaries).values(rows);
    const page = await request(app).get('/api/summaries?page=1').set(authHeader(admin)).expect(200);
    expect(page.body.data.items).toHaveLength(20);
    expect(page.body.data.hasMore).toBe(true);
    const clientPage = await request(app).get('/api/summaries').set(authHeader(client)).expect(200);
    expect(
      clientPage.body.data.items.every(
        (s: { publishedAt: string | null }) => s.publishedAt !== null,
      ),
    ).toBe(true);
  });
});
