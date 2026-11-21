import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import {
  accountTokens,
  clients,
  deliveryEvents,
  deliveryRevisions,
  mailOutbox,
  projects,
  scopeProposals,
  tickets,
  users,
} from '../src/db/schema';
import { onboardingForClient } from '../src/services/onboarding.service';
import type { AuthenticatedUser } from '../src/types/auth';
import { authHeader, loginSession } from './helpers/auth';

let admin: AuthenticatedUser, clientId: string;
const app = createApp();
beforeEach(async () => {
  await seedDatabase();
  admin = (await db.select().from(users).where(eq(users.role, 'ADMIN')))[0]!;
  const [client] = await db
    .insert(clients)
    .values({ name: 'Harbor Agency (Fictional)', contactEmail: 'hello@harbor.example' })
    .returning();
  clientId = client!.id;
});
afterAll(() => pool.end());

async function contact(status = 'INVITED') {
  const [person] = await db
    .insert(users)
    .values({
      name: 'Harbor Reviewer',
      email: 'reviewer@harbor.example',
      passwordHash: 'not-a-login-hash',
      role: 'CLIENT',
      clientId,
      accountStatus: status,
    })
    .returning();
  return person!;
}
async function ticket() {
  const [project] = await db
    .insert(projects)
    .values({ name: 'Shipment Portal', clientId })
    .returning();
  const [record] = await db
    .insert(tickets)
    .values({
      title: 'Find shipment NS-1042',
      description: 'Show active and archived shipments.',
      category: 'FEATURE_REQUEST',
      projectId: project!.id,
      createdById: admin.id,
    })
    .returning();
  return record!;
}

it('does not count another client project, active contact, request or decision', async () => {
  const otherTicket = (await db.select().from(tickets))[0]!;
  const otherClient = (await db.select().from(users).where(eq(users.role, 'CLIENT')))[0]!;
  const [revision] = await db
    .insert(deliveryRevisions)
    .values({
      ticketId: otherTicket.id,
      revision: 1,
      outcome: 'Unrelated agreed outcome',
      reviewerId: otherClient.id,
      reviewerName: otherClient.name,
    })
    .returning();
  await db.insert(deliveryEvents).values({
    revisionId: revision!.id,
    actorId: otherClient.id,
    actorName: otherClient.name,
    action: 'AGREED',
  });
  expect(await onboardingForClient(admin, clientId)).toEqual({
    client: { id: clientId, name: 'Harbor Agency (Fictional)' },
    project: null,
    reviewer: null,
    invitation: null,
    request: null,
    decision: null,
  });
});

it('distinguishes a queued or accepted invitation from active reviewer access without exposing tokens', async () => {
  const person = await contact();
  const [token] = await db
    .insert(accountTokens)
    .values({
      userId: person.id,
      tokenHash: 'a'.repeat(64),
      kind: 'INVITATION',
      expiresAt: new Date(Date.now() + 10000),
    })
    .returning();
  const id = randomUUID();
  await db.insert(mailOutbox).values({
    id,
    tokenId: token!.id,
    kind: 'INVITATION',
    payload: 'private-encrypted-payload',
    expiresAt: token!.expiresAt,
  });
  const pending = await onboardingForClient(admin, clientId);
  expect(pending.invitation).toEqual({ status: 'PENDING', name: person.name });
  expect(pending.reviewer).toBeNull();
  expect(JSON.stringify(pending)).not.toMatch(/token|payload|passwordHash/);
  await db.update(mailOutbox).set({ status: 'DELIVERED' }).where(eq(mailOutbox.id, id));
  expect((await onboardingForClient(admin, clientId)).reviewer).toBeNull();
  await db.update(users).set({ accountStatus: 'ACTIVE' }).where(eq(users.id, person.id));
  expect((await onboardingForClient(admin, clientId)).reviewer).toEqual({
    id: person.id,
    name: person.name,
  });
  await db.update(users).set({ accountStatus: 'DISABLED' }).where(eq(users.id, person.id));
  expect((await onboardingForClient(admin, clientId)).reviewer).toBeNull();
});

it('reflects organisation and role changes in current reviewer eligibility', async () => {
  const person = await contact('ACTIVE');
  await db.update(users).set({ role: 'DEVELOPER' }).where(eq(users.id, person.id));
  expect((await onboardingForClient(admin, clientId)).reviewer).toBeNull();
  await db.update(users).set({ role: 'CLIENT', clientId: null }).where(eq(users.id, person.id));
  expect((await onboardingForClient(admin, clientId)).reviewer).toBeNull();
});

it('links actual client decisions without treating outcome agreement as delivery acceptance', async () => {
  const person = await contact('ACTIVE');
  const record = await ticket();
  const [revision] = await db
    .insert(deliveryRevisions)
    .values({
      ticketId: record.id,
      revision: 1,
      outcome: 'Find all shipment references',
      reviewerId: person.id,
      reviewerName: person.name,
    })
    .returning();
  await db.insert(deliveryEvents).values({
    revisionId: revision!.id,
    actorId: person.id,
    actorName: person.name,
    action: 'AGREED',
  });
  const state = await onboardingForClient(admin, clientId);
  expect(state.request).toEqual({ id: record.id, title: record.title });
  expect(state.project?.id).toBe(record.projectId);
  expect(state.decision).toMatchObject({
    ticketId: record.id,
    action: 'AGREED',
    actor: person.name,
    section: 'delivery',
  });
});

it('links a recorded scope decision even when delivery has not started', async () => {
  const person = await contact('ACTIVE');
  const record = await ticket();
  await db.insert(scopeProposals).values({
    ticketId: record.id,
    revision: 1,
    scope: 'Shipment search',
    exclusions: 'No imports',
    estimate: 'Two days',
    deliveryImplications: 'Proposed date only',
    approverId: person.id,
    approverName: person.name,
    proposedBy: admin.name,
    state: 'CHANGES_REQUESTED',
    decidedBy: person.name,
    decidedAt: new Date(),
  });
  expect((await onboardingForClient(admin, clientId)).decision).toMatchObject({
    ticketId: record.id,
    action: 'CHANGES_REQUESTED',
    section: 'scope',
  });
});

it('rechecks disabled and demoted administrators inside the read transaction', async () => {
  await db.update(users).set({ role: 'DEVELOPER' }).where(eq(users.id, admin.id));
  await expect(onboardingForClient(admin, clientId)).rejects.toThrow();
  await db
    .update(users)
    .set({ role: 'ADMIN', accountStatus: 'DISABLED' })
    .where(eq(users.id, admin.id));
  await expect(onboardingForClient(admin, clientId)).rejects.toThrow();
});

it('requires administrator scope and a valid existing client over HTTP', async () => {
  for (const email of ['developer@example.com', 'client@example.com', 'bluewave@example.com']) {
    await request(app)
      .get(`/api/dashboard/onboarding/client?clientId=${clientId}`)
      .set(authHeader(await loginSession(app, email)))
      .expect(403);
  }
  const auth = authHeader(await loginSession(app, 'admin@example.com'));
  await request(app).get('/api/dashboard/onboarding/client?clientId=invalid').set(auth).expect(400);
  await request(app)
    .get(`/api/dashboard/onboarding/client?clientId=${randomUUID()}`)
    .set(auth)
    .expect(404);
  await request(app)
    .get(`/api/dashboard/onboarding/client?clientId=${clientId}`)
    .set(auth)
    .expect(200);
});
