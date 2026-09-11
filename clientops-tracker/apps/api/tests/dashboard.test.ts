import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { authHeader, loginSession, type SessionAuth } from './helpers/auth';

const app = createApp();
let admin: SessionAuth;
let developer: SessionAuth;
let clients: SessionAuth[];
const get = (path: string, auth: SessionAuth) => request(app).get(path).set(authHeader(auth));

describe('Actionable dashboard queries', () => {
  beforeAll(async () => {
    await seedDatabase();
    admin = await loginSession(app, 'admin@example.com');
    developer = await loginSession(app, 'developer@example.com');
    clients = [
      await loginSession(app, 'client@example.com'),
      await loginSession(app, 'bluewave@example.com'),
    ];
  });
  afterAll(() => pool.end());

  it('matches all four metric destinations over the full authorised scope, not a single page', async () => {
    for (const auth of [admin, developer, ...clients]) {
      const metrics = (await get('/api/dashboard/metrics', auth).expect(200)).body.data;
      for (const [filter, key] of [
        ['status=UNRESOLVED', 'unresolvedTickets'],
        ['status=UNRESOLVED&priority=CRITICAL', 'criticalTickets'],
        ['status=WAITING_FOR_CLIENT', 'ticketsWaitingForClient'],
        [`resolvedMonth=${metrics.resolvedMonth}`, 'resolvedTicketsThisMonth'],
      ]) {
        const queue = (await get(`/api/tickets/queue?${filter}&limit=1`, auth).expect(200)).body
          .data;
        expect(queue.items.length).toBeLessThanOrEqual(1);
        expect(queue.total).toBe(metrics[key!]);
      }
    }
  });

  it('keeps personal and unassigned work distinct and supports stable page ordering', async () => {
    const me = (await get('/api/auth/me', developer)).body.data;
    const mine = (await get('/api/tickets/queue?assignment=mine&status=UNRESOLVED', developer)).body
      .data;
    expect(mine.total).toBeGreaterThan(0);
    expect(
      mine.items.every((ticket: { assignedToId: string }) => ticket.assignedToId === me.id),
    ).toBe(true);
    const unassigned = (
      await get('/api/tickets/queue?assignment=unassigned&status=UNRESOLVED', admin)
    ).body.data;
    expect(
      unassigned.items.every(
        (ticket: { assignedToId: string | null }) => ticket.assignedToId === null,
      ),
    ).toBe(true);
    const all = (await get('/api/tickets/queue?order=attention', admin)).body.data;
    const first = (await get('/api/tickets/queue?order=attention&limit=2', admin)).body.data;
    const second = (await get('/api/tickets/queue?order=attention&limit=2&page=2', admin)).body
      .data;
    expect([...first.items, ...second.items]).toEqual(all.items.slice(0, 4));
  });

  it('validates filters, treats search literally and cannot expand client organisation scope', async () => {
    for (const auth of clients) {
      await get('/api/tickets/queue?assignment=mine', auth).expect(403);
      const other = clients.find((item) => item !== auth)!;
      const otherProject = (await get('/api/projects', other)).body.data[0];
      expect(
        (await get(`/api/tickets/queue?projectId=${otherProject.id}`, auth)).body.data.total,
      ).toBe(0);
      await get('/api/tickets/queue?clientId=all', auth).expect(400);
    }
    for (const query of ['limit=100000', 'page=-1', 'status=OTHER', 'resolvedMonth=2026-13']) {
      await get(`/api/tickets/queue?${query}`, admin).expect(400);
    }
    expect((await get('/api/tickets/queue?search=%25', admin)).body.data.total).toBe(0);
  });

  it('does not leak hidden comments, triage or their activity timestamps into either client feed', async () => {
    for (const auth of clients) {
      const ticket = (await get('/api/tickets/queue', auth)).body.data.items[0];
      await request(app)
        .post(`/api/tickets/${ticket.id}/triage-suggestion`)
        .set(authHeader(admin))
        .expect(201);
      const baseline = (await get('/api/dashboard/activity?limit=30', auth)).body.data.items;
      await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set(authHeader(admin))
        .send({ body: 'Private investigation only', isInternal: true })
        .expect(201);
      await request(app)
        .patch(`/api/tickets/${ticket.id}/apply-triage-suggestion`)
        .set(authHeader(developer))
        .expect(200);
      expect((await get('/api/dashboard/activity?limit=30', auth)).body.data.items).toEqual(
        baseline,
      );
      await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set(authHeader(auth))
        .send({ body: 'Public customer reply' })
        .expect(201);
      const feed = (await get('/api/dashboard/activity?limit=30', auth)).body.data;
      expect(feed.items[0]).toMatchObject({ action: 'PUBLIC_COMMENT', recordId: ticket.id });
      expect(JSON.stringify(feed)).not.toMatch(/Private investigation|TRIAGE|INTERNAL_COMMENT/);
      const other = clients.find((item) => item !== auth)!;
      const otherFeed = (await get('/api/dashboard/activity?limit=30', other)).body.data;
      expect(
        otherFeed.items.some((item: { recordId: string }) => item.recordId === ticket.id),
      ).toBe(false);
    }
    const internal = (await get('/api/dashboard/activity?limit=30', admin)).body.data;
    expect(
      internal.items.some((item: { action: string }) => item.action === 'INTERNAL_COMMENT'),
    ).toBe(true);
  });

  it('paginates activity with a fixed upper time bound and never duplicates comment events', async () => {
    const first = (await get('/api/dashboard/activity?limit=2', admin)).body.data;
    const second = (
      await get(`/api/dashboard/activity?limit=2&page=2&before=${first.before}`, admin)
    ).body.data;
    expect(first.hasMore).toBe(true);
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(4);
    expect(
      [...first.items, ...second.items].every((item) => item.action !== 'COMMENT_CREATED'),
    ).toBe(true);
    await get('/api/dashboard/activity?limit=100', admin).expect(400);
    await request(app).get('/api/dashboard/activity').expect(401);
    await request(app).get('/api/tickets/queue').expect(401);
  });
});
