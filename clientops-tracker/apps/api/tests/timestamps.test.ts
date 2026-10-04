import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { clients, projects, releases, ticketComments, tickets, users } from '../src/db/schema';

beforeAll(() => seedDatabase());
afterAll(() => pool.end());

it('maintains updatedAt for ORM mutations across all mutable business tables', async () => {
  const old = new Date('2020-01-01T00:00:00Z');
  for (const table of [clients, projects, releases, ticketComments, tickets, users]) {
    const [row] = await db.select().from(table).limit(1);
    if (!row) throw new Error('Seeded table is empty');
    await db.update(table).set({ updatedAt: old }).where(eq(table.id, row.id));
    const [updated] = await db
      .update(table)
      .set({ createdAt: row.createdAt })
      .where(eq(table.id, row.id))
      .returning();
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(old.getTime());
    expect(updated!.createdAt).toEqual(row.createdAt);
  }
});

it('keeps explicitly supplied historical timestamps for imports and fixtures', async () => {
  const [row] = await db.select().from(tickets).limit(1);
  const historical = new Date('2021-04-03T12:00:00Z');
  const [updated] = await db
    .update(tickets)
    .set({ updatedAt: historical })
    .where(eq(tickets.id, row!.id))
    .returning();
  expect(updated!.updatedAt).toEqual(historical);
});
