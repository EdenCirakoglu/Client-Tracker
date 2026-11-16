import { inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { deliveryRevisions, projects, scopeProposals, tickets } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';
import type { getTicketQueue } from '../src/services/queue.service';
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

  describe('Personal workflow lanes', () => {
    type Lane = 'ready' | 'changes' | 'waiting';
    type QueuePage = Awaited<ReturnType<typeof getTicketQueue>>;
    type Fixture = {
      key: string;
      lane: Lane | null;
      status?: typeof tickets.$inferInsert.status;
      scope?: string[];
      delivery?: string[];
      assignee?: 'admin' | 'unassigned';
    };
    const fixtures: Fixture[] = [
      ...Array.from({ length: 53 }, (_, i) => ({ key: `ready-${i}`, lane: 'ready' as const })),
      {
        key: 'agreed-latest',
        lane: 'ready',
        scope: ['CHANGES_REQUESTED', 'PROPOSED', 'APPROVED'],
        delivery: ['CHANGES_REQUESTED', 'PROPOSED', 'AGREED'],
      },
      { key: 'accepted-unresolved', lane: 'ready', delivery: ['AWAITING_ACCEPTANCE', 'ACCEPTED'] },
      { key: 'rejected-scope', lane: 'ready', scope: ['PROPOSED', 'REJECTED'] },
      {
        key: 'scope-changes',
        lane: 'changes',
        status: 'WAITING_FOR_CLIENT',
        scope: ['PROPOSED', 'CHANGES_REQUESTED'],
        delivery: ['AWAITING_ACCEPTANCE'],
      },
      {
        key: 'delivery-changes',
        lane: 'changes',
        scope: ['PROPOSED'],
        delivery: ['PROPOSED', 'CHANGES_REQUESTED'],
      },
      {
        key: 'both-changes',
        lane: 'changes',
        scope: ['CHANGES_REQUESTED'],
        delivery: ['CHANGES_REQUESTED'],
      },
      {
        key: 'resolved-changes',
        lane: 'changes',
        status: 'RESOLVED',
        scope: ['CHANGES_REQUESTED'],
        delivery: ['ACCEPTED'],
      },
      { key: 'closed-changes', lane: 'changes', status: 'CLOSED', delivery: ['CHANGES_REQUESTED'] },
      { key: 'scope-proposed', lane: 'waiting', scope: ['PROPOSED'], delivery: ['AGREED'] },
      { key: 'delivery-proposed', lane: 'waiting', scope: ['APPROVED'], delivery: ['PROPOSED'] },
      {
        key: 'resolved-acceptance',
        lane: 'waiting',
        status: 'RESOLVED',
        scope: ['APPROVED'],
        delivery: ['AWAITING_ACCEPTANCE'],
      },
      { key: 'closed-proposal', lane: 'waiting', status: 'CLOSED', scope: ['PROPOSED'] },
      {
        key: 'ticket-waiting',
        lane: 'waiting',
        status: 'WAITING_FOR_CLIENT',
        scope: ['APPROVED'],
        delivery: ['ACCEPTED'],
      },
      { key: 'scope-proposed-latest', lane: 'waiting', scope: ['CHANGES_REQUESTED', 'PROPOSED'] },
      {
        key: 'delivery-proposed-latest',
        lane: 'waiting',
        delivery: ['CHANGES_REQUESTED', 'PROPOSED'],
      },
      {
        key: 'resolved-accepted',
        lane: null,
        status: 'RESOLVED',
        scope: ['PROPOSED', 'APPROVED'],
        delivery: ['CHANGES_REQUESTED', 'AWAITING_ACCEPTANCE', 'ACCEPTED'],
      },
      { key: 'closed-complete', lane: null, status: 'CLOSED', scope: ['APPROVED'] },
      { key: 'resolved-no-workflow', lane: null, status: 'RESOLVED' },
      { key: 'other-ready', lane: 'ready', assignee: 'admin' },
      { key: 'other-changes', lane: 'changes', assignee: 'admin', scope: ['CHANGES_REQUESTED'] },
      {
        key: 'other-waiting',
        lane: 'waiting',
        assignee: 'admin',
        delivery: ['AWAITING_ACCEPTANCE'],
      },
      { key: 'unassigned-ready', lane: 'ready', assignee: 'unassigned' },
      {
        key: 'unassigned-changes',
        lane: 'changes',
        assignee: 'unassigned',
        delivery: ['CHANGES_REQUESTED'],
      },
      { key: 'unassigned-waiting', lane: 'waiting', assignee: 'unassigned', scope: ['PROPOSED'] },
    ];
    const prefix = 'Personal workflow regression ';
    let mineId: string;
    let adminId: string;
    let reviewers: { id: string; name: string; clientId: string }[];
    let inserted: (typeof tickets.$inferSelect)[];
    let fixtureProjects: (typeof projects.$inferSelect)[];
    const ticketFor = (key: string) => inserted.find((ticket) => ticket.title === prefix + key)!;
    const queue = async (lane: Lane, extra = '', auth = developer): Promise<QueuePage> =>
      (
        await get(
          `/api/tickets/queue?assignment=mine&workflow=${lane}&search=${encodeURIComponent(prefix)}${extra}`,
          auth,
        ).expect(200)
      ).body.data;

    beforeAll(async () => {
      mineId = (await get('/api/auth/me', developer).expect(200)).body.data.id;
      adminId = (await get('/api/auth/me', admin).expect(200)).body.data.id;
      reviewers = [];
      for (const auth of clients) {
        reviewers.push((await get('/api/auth/me', auth).expect(200)).body.data);
      }
      fixtureProjects = await db
        .insert(projects)
        .values(
          reviewers.map((reviewer) => ({
            clientId: reviewer.clientId,
            name: prefix + reviewer.name,
          })),
        )
        .returning();
      inserted = await db
        .insert(tickets)
        .values(
          fixtures.map((fixture, index) => ({
            projectId: fixtureProjects[index % 2]!.id,
            createdById: reviewers[index % 2]!.id,
            assignedToId:
              fixture.assignee === 'admin'
                ? adminId
                : fixture.assignee === 'unassigned'
                  ? null
                  : mineId,
            title: prefix + fixture.key,
            description: 'Dedicated queue regression fixture.',
            category: 'FEATURE_REQUEST' as const,
            status: fixture.status ?? 'OPEN',
            priority: index % 2 ? ('HIGH' as const) : ('MEDIUM' as const),
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
          })),
        )
        .returning();
      const scopeRows = fixtures.flatMap((fixture, index) =>
        (fixture.scope ?? []).map((state, revision) => ({
          ticketId: ticketFor(fixture.key).id,
          revision: revision + 1,
          state,
          scope: 'Recorded scope for queue regression.',
          exclusions: 'No additional work.',
          estimate: 'Two days',
          deliveryImplications: 'The delivery date depends on approval.',
          approverId: reviewers[index % 2]!.id,
          approverName: `${reviewers[index % 2]!.name} (scope snapshot)`,
          proposedBy: 'Demo Developer',
          // Deliberately reverse timestamps: revision, not createdAt, defines latest.
          createdAt: new Date(Date.UTC(2026, 0, 10 - revision)),
        })),
      );
      const deliveryRows = fixtures.flatMap((fixture, index) =>
        (fixture.delivery ?? []).map((state, revision) => ({
          ticketId: ticketFor(fixture.key).id,
          revision: revision + 1,
          state,
          outcome: 'Recorded delivery outcome for queue regression.',
          reviewerId: reviewers[index % 2]!.id,
          reviewerName: `${reviewers[index % 2]!.name} (delivery snapshot)`,
          createdAt: new Date(Date.UTC(2026, 0, 10 - revision)),
        })),
      );
      await db.insert(scopeProposals).values(scopeRows);
      await db.insert(deliveryRevisions).values(deliveryRows);
    });

    afterAll(async () => {
      if (fixtureProjects?.length)
        await db.delete(projects).where(
          inArray(
            projects.id,
            fixtureProjects.map((project) => project.id),
          ),
        );
    });

    it('filters the entire assigned scope before counts and pagination in both orders', async () => {
      for (const lane of ['ready', 'changes', 'waiting'] as const) {
        const expected = fixtures.filter((fixture) => fixture.lane === lane && !fixture.assignee);
        for (const order of ['newest', 'attention']) {
          const first = await queue(lane, `&order=${order}&limit=50`);
          const second = await queue(lane, `&order=${order}&limit=50&page=2`);
          expect(first.total).toBe(expected.length);
          expect(second.total).toBe(expected.length);
          expect(first.page).toBe(1);
          expect(second.page).toBe(2);
          expect(first.limit).toBe(50);
          const all = [...first.items, ...second.items];
          expect(new Set(all.map((item) => item.id))).toEqual(
            new Set(expected.map((fixture) => ticketFor(fixture.key).id)),
          );
          expect(all.every((item) => item.assignedToId === mineId && item.workflow === lane)).toBe(
            true,
          );
          expect(new Set(all.map((item) => item.client.id)).size).toBe(2);
          const small = await queue(lane, `&order=${order}&limit=2`);
          const next = await queue(lane, `&order=${order}&limit=2&page=2`);
          expect(small.total).toBe(expected.length);
          expect([...small.items, ...next.items]).toEqual(all.slice(0, 4));
          expect((await queue(lane, '&page=10000')).items).toEqual([]);
        }
      }
    });

    it('returns actual latest revisions and actions with changes taking precedence over waiting', async () => {
      const records: QueuePage['items'] = [];
      for (const lane of ['ready', 'changes', 'waiting'] as const) {
        records.push(
          ...(await queue(lane, '&limit=50')).items,
          ...(await queue(lane, '&limit=50&page=2')).items,
        );
      }
      const itemFor = (key: string) => records.find((item) => item.id === ticketFor(key).id)!;
      for (const fixture of fixtures.filter((item) => item.lane && !item.assignee)) {
        const item = itemFor(fixture.key);
        for (const kind of ['scope', 'delivery'] as const) {
          const history = fixture[kind];
          expect(item.currentWorkflow![kind]).toEqual(
            history?.length
              ? {
                  id: expect.any(String),
                  revision: history.length,
                  state: history[history.length - 1],
                  ...(kind === 'scope'
                    ? {
                        approverName: `${reviewers[fixtures.indexOf(fixture) % 2]!.name} (scope snapshot)`,
                      }
                    : {
                        reviewerName: `${reviewers[fixtures.indexOf(fixture) % 2]!.name} (delivery snapshot)`,
                      }),
                }
              : null,
          );
        }
        expect(item.nextAction).toEqual(expect.any(String));
        expect(item.actionReason).toEqual(expect.any(String));
      }
      expect(itemFor('scope-changes')).toMatchObject({
        workflow: 'changes',
        workflowHref: `/tickets/${ticketFor('scope-changes').id}#scope`,
        nextAction: 'Review scope changes',
      });
      expect(itemFor('delivery-changes')).toMatchObject({
        workflow: 'changes',
        workflowHref: `/tickets/${ticketFor('delivery-changes').id}#delivery`,
        nextAction: 'Review delivery changes',
      });
      expect(itemFor('both-changes').workflowHref).toMatch(/#scope$/);
      expect(itemFor('scope-proposed-latest')).toMatchObject({
        workflow: 'waiting',
        actionReason: `Scope revision 2 is awaiting a decision from ${itemFor('scope-proposed-latest').currentWorkflow!.scope!.approverName}.`,
      });
      expect(itemFor('delivery-proposed-latest')).toMatchObject({
        workflow: 'waiting',
        nextAction: 'View delivery proposal',
        actionReason: `Delivery revision 2 is awaiting agreement from ${itemFor('delivery-proposed-latest').currentWorkflow!.delivery!.reviewerName}.`,
      });
      expect(itemFor('agreed-latest')).toMatchObject({
        workflow: 'ready',
        currentWorkflow: {
          scope: { revision: 3, state: 'APPROVED' },
          delivery: { revision: 3, state: 'AGREED' },
        },
      });
      expect(itemFor('resolved-acceptance')).toMatchObject({
        status: 'RESOLVED',
        workflow: 'waiting',
        nextAction: 'View acceptance request',
        actionReason: `Delivery revision 1 is awaiting acceptance from ${itemFor('resolved-acceptance').currentWorkflow!.delivery!.reviewerName}.`,
      });
      expect(itemFor('ticket-waiting')).toMatchObject({
        workflowHref: `/tickets/${ticketFor('ticket-waiting').id}`,
        actionReason: 'The ticket is marked as waiting for the client.',
      });
      expect(itemFor('rejected-scope')).toMatchObject({
        workflow: 'ready',
        nextAction: 'Review rejected scope',
        currentWorkflow: { scope: { revision: 2, state: 'REJECTED' } },
      });
      expect(itemFor('accepted-unresolved').workflow).toBe('ready');
      expect(itemFor('resolved-accepted')).toBeUndefined();
    });

    it('intersects existing filters and retains resolved or closed tickets only for pending work', async () => {
      const resolvedWaiting = await queue('waiting', '&status=RESOLVED');
      expect(resolvedWaiting.items.map((item) => item.id)).toEqual([
        ticketFor('resolved-acceptance').id,
      ]);
      expect((await queue('changes', '&status=RESOLVED')).items.map((item) => item.id)).toEqual([
        ticketFor('resolved-changes').id,
      ]);
      expect((await queue('waiting', '&status=CLOSED')).items.map((item) => item.id)).toEqual([
        ticketFor('closed-proposal').id,
      ]);
      expect((await queue('changes', '&status=CLOSED')).items.map((item) => item.id)).toEqual([
        ticketFor('closed-changes').id,
      ]);
      expect((await queue('ready', '&status=RESOLVED')).total).toBe(0);
      expect((await queue('ready', '&status=CLOSED')).total).toBe(0);
      expect((await queue('waiting', '&status=UNRESOLVED')).total).toBe(5);
      for (const lane of ['ready', 'changes', 'waiting'] as const) {
        const filtered = await queue(
          lane,
          `&projectId=${fixtureProjects[1]!.id}&clientId=${fixtureProjects[1]!.clientId}&priority=HIGH&category=FEATURE_REQUEST&limit=50`,
        );
        expect(filtered.total).toBe(
          fixtures.filter(
            (fixture, index) => fixture.lane === lane && !fixture.assignee && index % 2 === 1,
          ).length,
        );
        expect(
          filtered.items.every(
            (item) => item.projectId === fixtureProjects[1]!.id && item.priority === 'HIGH',
          ),
        ).toBe(true);
        expect((await queue(lane, `&assignedToId=${adminId}`)).total).toBe(0);
        const adminQueue = await queue(lane, '', admin);
        expect(adminQueue.total).toBe(1);
        expect(adminQueue.items[0]!.assignedToId).toBe(adminId);
      }
    });

    it('requires personal assignment, rejects client access and preserves legacy response fields', async () => {
      for (const filter of [
        'workflow=other&assignment=mine',
        'workflow=ready',
        'workflow=ready&assignment=unassigned',
        `workflow=ready&assignedToId=${mineId}`,
      ]) {
        await get(`/api/tickets/queue?${filter}`, developer).expect(400);
      }
      for (const auth of clients) {
        for (const lane of ['ready', 'changes', 'waiting']) {
          await get(`/api/tickets/queue?workflow=${lane}&assignment=mine`, auth).expect(403);
          await get(`/api/tickets/queue?workflow=${lane}`, auth).expect(403);
        }
        const own = (await get('/api/auth/me', auth).expect(200)).body.data;
        const legacy = (
          await get(
            `/api/tickets/queue?search=${encodeURIComponent(prefix)}&limit=50`,
            auth,
          ).expect(200)
        ).body.data;
        expect(
          legacy.items.every((item: QueuePage['items'][number]) => item.client.id === own.clientId),
        ).toBe(true);
        for (const item of legacy.items) {
          expect(Object.keys(item).sort()).toEqual(
            [...Object.keys(inserted[0]!), 'project', 'client', 'assignee'].sort(),
          );
        }
      }
      const legacy = (
        await get(
          `/api/tickets/queue?assignment=mine&search=${encodeURIComponent(prefix)}&limit=50`,
          developer,
        ).expect(200)
      ).body.data;
      expect(legacy.total).toBe(fixtures.filter((fixture) => !fixture.assignee).length);
      expect(legacy.items[0]).not.toHaveProperty('currentWorkflow');
      expect(legacy.items[0]).not.toHaveProperty('workflow');
    });
  });
});
