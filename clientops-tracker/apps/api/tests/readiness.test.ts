import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { clients, ticketEvents, users } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';

const app = createApp();
let admin: string;
let developer: string;
let northstar: string;
let bluewave: string;

async function login(email: string) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  expect(response.status).toBe(200);
  return response.body.data.token as string;
}

const get = (path: string, token: string) => request(app).get(path).auth(token, { type: 'bearer' });

describe('Release permission and persistence boundaries', () => {
  beforeAll(async () => {
    await seedDatabase();
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.contactEmail, 'support@bluewave.example'));
    if (!client) throw new Error('Missing second demo organisation');
    await db
      .insert(users)
      .values({
        name: 'Bluewave Demo Contact',
        email: 'bluewave@example.com',
        role: 'CLIENT',
        passwordHash: await bcrypt.hash('password123', 12),
        clientId: client.id,
      })
      .onConflictDoNothing();
    admin = await login('admin@example.com');
    developer = await login('developer@example.com');
    northstar = await login('client@example.com');
    bluewave = await login('bluewave@example.com');
  });
  afterAll(() => pool.end());

  it('omits operational workload from both client dashboard responses', async () => {
    for (const token of [northstar, bluewave]) {
      const metrics = await get('/api/dashboard/metrics', token);
      expect(metrics.status).toBe(200);
      expect(metrics.body.data).not.toHaveProperty('developerWorkload');
      expect(JSON.stringify(metrics.body)).not.toContain('developer@example.com');
      const tickets = await get('/api/tickets', token);
      expect(metrics.body.data.totalOpenTickets).toBe(
        tickets.body.data.filter((ticket: { status: string }) => ticket.status === 'OPEN').length,
      );
    }
    expect(
      (await get('/api/dashboard/metrics', developer)).body.data.developerWorkload.length,
    ).toBeGreaterThan(0);
  });

  it('rejects direct cross-organisation reads and writes in both directions', async () => {
    for (const [own, other] of [
      [northstar, bluewave],
      [bluewave, northstar],
    ] as const) {
      const ownClients = (await get('/api/clients', own)).body.data;
      expect(ownClients).toHaveLength(1);
      const otherClient = (await get('/api/clients', other)).body.data[0];
      const otherProject = (await get('/api/projects', other)).body.data[0];
      const otherTicket = (await get('/api/tickets', other)).body.data[0];
      for (const path of [
        `/api/clients/${otherClient.id}`,
        `/api/projects/${otherProject.id}`,
        `/api/tickets/${otherTicket.id}`,
        `/api/tickets/${otherTicket.id}/comments`,
      ]) {
        expect((await get(path, own)).status).toBe(404);
      }
      expect(
        (
          await request(app).post('/api/tickets').auth(own, { type: 'bearer' }).send({
            projectId: otherProject.id,
            title: 'Cross-tenant attempt',
            description: 'Must not be persisted.',
            category: 'SUPPORT',
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .post(`/api/tickets/${otherTicket.id}/comments`)
            .auth(own, { type: 'bearer' })
            .send({ body: 'Must not be persisted.' })
        ).status,
      ).toBe(404);
      for (const path of ['/api/projects', '/api/tickets', '/api/releases']) {
        const records = (await get(path, own)).body.data as {
          clientId?: string;
          project?: { clientId: string };
        }[];
        expect(records.length).toBeGreaterThan(0);
        expect(
          records.every(
            (record) => (record.clientId ?? record.project?.clientId) === ownClients[0].id,
          ),
        ).toBe(true);
      }
    }
  });

  it('distinguishes Open tickets from unresolved critical tickets and assigned workload', async () => {
    for (const token of [admin, developer, northstar, bluewave]) {
      const tickets = (await get('/api/tickets', token)).body.data as {
        status: string;
        priority: string;
        assignedToId: string | null;
      }[];
      const metrics = (await get('/api/dashboard/metrics', token)).body.data;
      const unresolved = tickets.filter(
        (ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status),
      );
      expect(metrics.totalOpenTickets).toBe(
        tickets.filter((ticket) => ticket.status === 'OPEN').length,
      );
      expect(metrics.criticalTickets).toBe(
        unresolved.filter((ticket) => ticket.priority === 'CRITICAL').length,
      );
      expect(metrics.ticketsWaitingForClient).toBe(
        tickets.filter((ticket) => ticket.status === 'WAITING_FOR_CLIENT').length,
      );
      expect(
        metrics.ticketsByStatus.reduce(
          (sum: number, item: { count: number }) => sum + item.count,
          0,
        ),
      ).toBe(tickets.length);
      expect(
        metrics.ticketsByPriority.reduce(
          (sum: number, item: { count: number }) => sum + item.count,
          0,
        ),
      ).toBe(tickets.length);
      for (const workload of metrics.developerWorkload ?? []) {
        expect(workload.openTickets).toBe(
          unresolved.filter((ticket) => ticket.assignedToId === workload.developerId).length,
        );
      }
    }
  });

  it('keeps saved triage, internal comments and history private', async () => {
    const ownTicket = (await get('/api/tickets', northstar)).body.data[0];
    await request(app)
      .post(`/api/tickets/${ownTicket.id}/comments`)
      .auth(admin, { type: 'bearer' })
      .send({ body: 'Private investigation note', isInternal: true })
      .expect(201);
    await request(app)
      .post(`/api/tickets/${ownTicket.id}/comments`)
      .auth(northstar, { type: 'bearer' })
      .send({ body: 'Public update' })
      .expect(201);
    const comments = await get(`/api/tickets/${ownTicket.id}/comments`, northstar);
    expect(JSON.stringify(comments.body)).not.toContain('Private investigation note');
    expect(JSON.stringify(comments.body)).toContain('Public update');
    expect((await get(`/api/tickets/${ownTicket.id}`, northstar)).body.data).not.toHaveProperty(
      'triageSuggestion',
    );
    expect((await get(`/api/tickets/${ownTicket.id}`, northstar)).body.data).not.toHaveProperty(
      'events',
    );
    await request(app)
      .post(`/api/tickets/${ownTicket.id}/comments`)
      .auth(northstar, { type: 'bearer' })
      .send({ body: 'Internal attempt', isInternal: true })
      .expect(403);
    await request(app)
      .post(`/api/tickets/${ownTicket.id}/triage-suggestion`)
      .auth(northstar, { type: 'bearer' })
      .expect(403);
    await request(app)
      .patch(`/api/tickets/${ownTicket.id}/apply-triage-suggestion`)
      .auth(northstar, { type: 'bearer' })
      .expect(403);
  });

  it('does not expose the initial internal suggestion to a client', async () => {
    const project = (await get('/api/projects', northstar)).body.data[0];
    const response = await request(app)
      .post('/api/tickets')
      .auth(northstar, { type: 'bearer' })
      .send({
        projectId: project.id,
        title: 'Client security question',
        description: 'Please review account security.',
        category: 'SUPPORT',
        priority: 'LOW',
      });
    expect(response.status).toBe(201);
    expect(response.body.data).not.toHaveProperty('triageSuggestion');
    expect(response.body.data.category).toBe('SUPPORT');
    expect(
      (await get(`/api/tickets/${response.body.data.id}`, admin)).body.data.triageSuggestion,
    ).toBeTruthy();
  });

  it('enforces write permissions independently of frontend navigation', async () => {
    const ticket = (await get('/api/tickets', northstar)).body.data[0];
    for (const token of [northstar, bluewave, developer]) {
      await request(app).post('/api/clients').auth(token, { type: 'bearer' }).send({}).expect(403);
      await request(app).post('/api/projects').auth(token, { type: 'bearer' }).send({}).expect(403);
      await request(app).post('/api/releases').auth(token, { type: 'bearer' }).send({}).expect(403);
    }
    for (const token of [northstar, bluewave]) {
      await request(app)
        .patch(`/api/tickets/${ticket.id}`)
        .auth(token, { type: 'bearer' })
        .send({ status: 'CLOSED' })
        .expect(403);
      const ownProject = (await get('/api/projects', token)).body.data[0];
      const me = (await get('/api/auth/me', developer)).body.data;
      await request(app)
        .post('/api/tickets')
        .auth(token, { type: 'bearer' })
        .send({
          projectId: ownProject.id,
          title: 'Assignment attempt',
          description: 'Must be rejected.',
          category: 'SUPPORT',
          assignedToId: me.id,
        })
        .expect(403);
    }
  });

  it('loads the saved suggestion and applies it once even for concurrent requests', async () => {
    const project = (await get('/api/projects', admin)).body.data[0];
    const created = await request(app).post('/api/tickets').auth(admin, { type: 'bearer' }).send({
      projectId: project.id,
      title: 'Security breach investigation',
      description: 'Exposed records need investigation.',
      category: 'SUPPORT',
      priority: 'LOW',
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const detail = await get(`/api/tickets/${id}`, developer);
    expect(detail.body.data.triageSuggestion?.id).toBe(created.body.data.triageSuggestion.id);
    const applied = await Promise.all(
      [1, 2, 3].map(() =>
        request(app)
          .patch(`/api/tickets/${id}/apply-triage-suggestion`)
          .auth(developer, { type: 'bearer' }),
      ),
    );
    expect(applied.every((response) => response.status === 200)).toBe(true);
    const refreshed = (await get(`/api/tickets/${id}`, developer)).body.data;
    expect(refreshed).toMatchObject({
      category: 'SECURITY',
      priority: 'CRITICAL',
      triageSuggestion: { accepted: true },
    });
    const events = await db
      .select()
      .from(ticketEvents)
      .where(
        and(eq(ticketEvents.ticketId, id), eq(ticketEvents.eventType, 'TRIAGE_SUGGESTION_APPLIED')),
      );
    expect(events).toHaveLength(1);
    expect(events[0]?.fromValue).toBe('SUPPORT/LOW');
    await request(app)
      .patch(`/api/tickets/${id}`)
      .auth(developer, { type: 'bearer' })
      .send({ priority: 'MEDIUM' })
      .expect(200);
    await request(app)
      .patch(`/api/tickets/${id}/apply-triage-suggestion`)
      .auth(developer, { type: 'bearer' })
      .expect(200);
    expect((await get(`/api/tickets/${id}`, developer)).body.data.priority).toBe('MEDIUM');
  });
});
