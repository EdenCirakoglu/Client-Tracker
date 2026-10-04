import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, expect, it } from 'vitest';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import {
  projects,
  ticketComments,
  ticketEvents,
  tickets,
  triageSuggestions,
  users,
} from '../src/db/schema';
import {
  createTicketCommentForUser,
  createTicketForUser,
  updateTicketForUser,
} from '../src/services/ticket.service';
import {
  applyLatestTriageSuggestion,
  generateTriageSuggestionForTicket,
} from '../src/services/triage.service';
import { publicUserColumns } from '../src/services/user.service';
import type { AuthenticatedUser } from '../src/types/auth';

let actor: AuthenticatedUser;
let client: AuthenticatedUser;
let projectId: string;
let ticketId: string;
let otherClientId: string;
const actions = ['create', 'update', 'comment', 'generate', 'apply'] as const;
type Action = (typeof actions)[number];

beforeEach(async () => {
  await seedDatabase();
  [actor] = (await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.email, 'developer@example.com'))) as [AuthenticatedUser];
  [client] = (await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.email, 'client@example.com'))) as [AuthenticatedUser];
  const allProjects = await db.select().from(projects);
  projectId = allProjects.find((project) => project.clientId === client.clientId)!.id;
  otherClientId = allProjects.find((project) => project.clientId !== client.clientId)!.clientId;
  ticketId = (
    await createTicketForUser(actor, {
      projectId,
      title: 'Fictional security breach',
      description: 'Exercise the authorization boundary.',
      category: 'SUPPORT',
      priority: 'LOW',
    })
  ).id;
});
afterAll(() => pool.end());

function mutate(action: Action, user = actor) {
  switch (action) {
    case 'create':
      return createTicketForUser(user, {
        projectId,
        title: 'Unauthorized write',
        description: 'Must not persist.',
        category: 'SUPPORT',
      });
    case 'update':
      return updateTicketForUser(user, ticketId, { status: 'IN_PROGRESS' });
    case 'comment':
      return createTicketCommentForUser(user, ticketId, {
        body: 'Must not persist.',
        isInternal: user.role !== 'CLIENT',
      });
    case 'generate':
      return generateTriageSuggestionForTicket(user, ticketId);
    case 'apply':
      return applyLatestTriageSuggestion(user, ticketId);
  }
}
async function snapshot() {
  return {
    tickets: await db.select().from(tickets).orderBy(tickets.id),
    comments: await db.select().from(ticketComments).orderBy(ticketComments.id),
    events: await db.select().from(ticketEvents).orderBy(ticketEvents.id),
    suggestions: await db.select().from(triageSuggestions).orderBy(triageSuggestions.id),
  };
}

it.each(
  actions.flatMap((action) =>
    ['disabled', 'role', 'organisation'].map((change) => ({ action, change })),
  ),
)(
  'rejects $action after the authenticated account changes ($change)',
  async ({ action, change }) => {
    await db
      .update(users)
      .set(
        change === 'disabled'
          ? { accountStatus: 'DISABLED' }
          : change === 'role'
            ? { role: 'CLIENT', clientId: otherClientId }
            : { clientId: otherClientId },
      )
      .where(eq(users.id, actor.id));
    const before = await snapshot();
    await expect(mutate(action)).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' });
    expect(await snapshot()).toEqual(before);
  },
);

it.each(['create', 'comment'] as const)(
  'rejects client %s after organisation changes',
  async (action) => {
    await db.update(users).set({ clientId: otherClientId }).where(eq(users.id, client.id));
    const before = await snapshot();
    await expect(mutate(action, client)).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' });
    expect(await snapshot()).toEqual(before);
  },
);

it('rejects direct client ticket updates and internal comments without route middleware', async () => {
  const before = await snapshot();
  await expect(updateTicketForUser(client, ticketId, { status: 'CLOSED' })).rejects.toMatchObject({
    code: 'FORBIDDEN',
  });
  await expect(
    createTicketCommentForUser(client, ticketId, { body: 'Private', isInternal: true }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(await snapshot()).toEqual(before);
});

it('waits for concurrent account disablement and rejects without ticket or history writes', async () => {
  const writer = await pool.connect();
  const before = await snapshot();
  let outcome: Promise<unknown> | undefined;
  try {
    await writer.query('BEGIN');
    await writer.query("UPDATE users SET account_status = 'DISABLED' WHERE id = $1", [actor.id]);
    const pid = (await writer.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!
      .pid;
    outcome = mutate('update').then(
      () => ({ allowed: true }),
      (error: unknown) => error,
    );
    // Observe an actual blocked query, not a sleep-based scheduling assumption.
    await expect
      .poll(
        async () => {
          const result = await pool.query<{ waiting: boolean }>(
            'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) AS waiting',
            [pid],
          );
          return result.rows[0]!.waiting;
        },
        { timeout: 3000 },
      )
      .toBe(true);
    await writer.query('COMMIT');
    await expect(outcome).resolves.toMatchObject({ code: 'ACCOUNT_CHANGED' });
    expect(await snapshot()).toEqual(before);
  } finally {
    await writer.query('ROLLBACK');
    writer.release();
    await outcome;
  }
});

it.each(['create', 'comment'] as const)(
  'rechecks project ownership under a concurrent transfer for %s',
  async (action) => {
    const writer = await pool.connect();
    const before = await snapshot();
    let outcome: Promise<unknown> | undefined;
    try {
      await writer.query('BEGIN');
      await writer.query('UPDATE projects SET client_id = $1 WHERE id = $2', [
        otherClientId,
        projectId,
      ]);
      const pid = (await writer.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!
        .pid;
      outcome = mutate(action, client).then(
        () => ({ allowed: true }),
        (error: unknown) => error,
      );
      await expect
        .poll(
          async () => {
            const result = await pool.query<{ waiting: boolean }>(
              'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) AS waiting',
              [pid],
            );
            return result.rows[0]!.waiting;
          },
          { timeout: 3000 },
        )
        .toBe(true);
      await writer.query('COMMIT');
      await expect(outcome).resolves.toMatchObject({
        code: action === 'create' ? 'PROJECT_NOT_FOUND' : 'TICKET_NOT_FOUND',
      });
      expect(await snapshot()).toEqual(before);
    } finally {
      await writer.query('ROLLBACK');
      writer.release();
      await outcome;
    }
  },
);

it('rejects inactive assignees without ticket or event changes', async () => {
  const [admin] = await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.email, 'admin@example.com'));
  await db.update(users).set({ accountStatus: 'DISABLED' }).where(eq(users.id, actor.id));
  const before = await snapshot();
  await expect(
    updateTicketForUser(admin!, ticketId, { assignedToId: actor.id }),
  ).rejects.toMatchObject({ code: 'INVALID_ASSIGNEE' });
  expect(await snapshot()).toEqual(before);
});
