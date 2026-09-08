import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { ticketEvents } from '../src/db/schema';

const app = createApp();

let adminToken: string;
let developerToken: string;
let clientToken: string;

describe('ClientOps Tracker API', () => {
  beforeAll(async () => {
    await seedDatabase();
    adminToken = await loginAs('admin@example.com');
    developerToken = await loginAs('developer@example.com');
    clientToken = await loginAs('client@example.com');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('logs in successfully with admin@example.com / password123', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).toMatchObject({
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects login with a wrong password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a protected route without a token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the current user with a valid token', async () => {
    const response = await request(app).get('/api/auth/me').set(authHeader(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: 'admin@example.com',
      role: 'ADMIN',
    });
  });

  it('allows an admin to create a client', async () => {
    const response = await request(app).post('/api/clients').set(authHeader(adminToken)).send({
      name: 'Phase 3 Test Client',
      contactEmail: 'phase3-client@example.com',
      phone: '+1-555-0199',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Phase 3 Test Client',
      contactEmail: 'phase3-client@example.com',
    });
  });

  it('allows an admin to create a project', async () => {
    const clientResponse = await request(app)
      .post('/api/clients')
      .set(authHeader(adminToken))
      .send({
        name: 'Phase 3 Project Client',
        contactEmail: 'phase3-project-client@example.com',
      });

    const response = await request(app).post('/api/projects').set(authHeader(adminToken)).send({
      clientId: clientResponse.body.data.id,
      name: 'Phase 3 Project',
      description: 'Project created by the Phase 3 API test suite.',
      status: 'ACTIVE',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      clientId: clientResponse.body.data.id,
      name: 'Phase 3 Project',
      status: 'ACTIVE',
    });
  });

  it("prevents a client from accessing another client's ticket", async () => {
    const ticket = await findTicketByTitle(adminToken, 'Investigate unusual failed login spike');

    const response = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set(authHeader(clientToken));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('hides internal comments from client users', async () => {
    const ticket = await findTicketByTitle(
      adminToken,
      'Shipment detail page fails to load for archived orders',
    );

    const adminCommentsResponse = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set(authHeader(adminToken));
    const clientCommentsResponse = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set(authHeader(clientToken));

    expect(adminCommentsResponse.status).toBe(200);
    expect(
      adminCommentsResponse.body.data.some(
        (comment: { isInternal: boolean }) => comment.isInternal,
      ),
    ).toBe(true);
    expect(clientCommentsResponse.status).toBe(200);
    expect(
      clientCommentsResponse.body.data.every(
        (comment: { isInternal: boolean }) => !comment.isInternal,
      ),
    ).toBe(true);
  });

  it('allows a developer to update ticket status', async () => {
    const ticket = await findTicketByTitle(
      adminToken,
      'Shipment detail page fails to load for archived orders',
    );

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set(authHeader(developerToken))
      .send({
        status: 'RESOLVED',
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: ticket.id,
      status: 'RESOLVED',
    });
    expect(response.body.data.resolvedAt).toEqual(expect.any(String));
  });

  it('requires authentication for dashboard metrics', async () => {
    const response = await request(app).get('/api/dashboard/metrics');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('generates SECURITY and high urgency for security tickets', async () => {
    const response = await createTicket(adminToken, {
      title: 'Potential data leak exposed in exported reports',
      description: 'The client says sensitive records may be exposed after a security breach.',
      category: 'SUPPORT',
      priority: 'LOW',
    });

    expect(response.body.data.triageSuggestion).toMatchObject({
      suggestedCategory: 'SECURITY',
    });
    expect(['HIGH', 'CRITICAL']).toContain(response.body.data.triageSuggestion.suggestedPriority);
  });

  it('generates PERFORMANCE for performance tickets', async () => {
    const response = await createTicket(adminToken, {
      title: 'Dashboard loading is slow',
      description: 'Users report latency and timeout errors when loading analytics.',
      category: 'SUPPORT',
      priority: 'LOW',
    });

    expect(response.body.data.triageSuggestion).toMatchObject({
      suggestedCategory: 'PERFORMANCE',
    });
  });

  it('generates FEATURE_REQUEST for feature requests', async () => {
    const response = await createTicket(adminToken, {
      title: 'Could you add a new feature for saved filters',
      description: 'The client would like an enhancement to improve reporting workflows.',
      category: 'SUPPORT',
      priority: 'LOW',
    });

    expect(response.body.data.triageSuggestion).toMatchObject({
      suggestedCategory: 'FEATURE_REQUEST',
    });
  });

  it('generates BUG for bug reports', async () => {
    const response = await createTicket(adminToken, {
      title: 'App crash on ticket save',
      description: 'The save button throws an error and the workflow is broken.',
      category: 'SUPPORT',
      priority: 'LOW',
    });

    expect(response.body.data.triageSuggestion).toMatchObject({
      suggestedCategory: 'BUG',
    });
  });

  it('generates SUPPORT for default tickets', async () => {
    const response = await createTicket(adminToken, {
      title: 'Question about account setup',
      description: 'The client needs clarification about expected behaviour in the portal.',
      category: 'BUG',
      priority: 'HIGH',
    });

    expect(response.body.data.triageSuggestion).toMatchObject({
      suggestedCategory: 'SUPPORT',
    });
  });

  it('allows an admin to generate a triage suggestion manually', async () => {
    const ticketResponse = await createTicket(adminToken, {
      title: 'Manual triage generation test',
      description: 'There is a timeout when loading the client dashboard.',
      category: 'SUPPORT',
      priority: 'LOW',
    });

    const response = await request(app)
      .post(`/api/tickets/${ticketResponse.body.data.id}/triage-suggestion`)
      .set(authHeader(adminToken));

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      ticketId: ticketResponse.body.data.id,
      suggestedCategory: 'PERFORMANCE',
      accepted: false,
    });
  });

  it('prevents a client from applying a triage suggestion', async () => {
    const ticketResponse = await createTicket(clientToken, {
      title: 'Client cannot apply triage',
      description: 'There is an error when opening the operations screen.',
      category: 'SUPPORT',
      priority: 'LOW',
    });

    const response = await request(app)
      .patch(`/api/tickets/${ticketResponse.body.data.id}/apply-triage-suggestion`)
      .set(authHeader(clientToken));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a developer to apply a triage suggestion and records a ticket event', async () => {
    const ticketResponse = await createTicket(adminToken, {
      title: 'Security breach requires apply flow',
      description: 'A hacked account may have exposed data in production.',
      category: 'SUPPORT',
      priority: 'LOW',
    });

    const response = await request(app)
      .patch(`/api/tickets/${ticketResponse.body.data.id}/apply-triage-suggestion`)
      .set(authHeader(developerToken));

    expect(response.status).toBe(200);
    expect(response.body.data.ticket).toMatchObject({
      id: ticketResponse.body.data.id,
      category: 'SECURITY',
    });
    expect(['HIGH', 'CRITICAL']).toContain(response.body.data.ticket.priority);
    expect(response.body.data.triageSuggestion.accepted).toBe(true);

    const [event] = await db
      .select()
      .from(ticketEvents)
      .where(
        and(
          eq(ticketEvents.ticketId, ticketResponse.body.data.id),
          eq(ticketEvents.eventType, 'TRIAGE_SUGGESTION_APPLIED'),
        ),
      )
      .limit(1);

    expect(event).toBeDefined();
    expect(event?.fromValue).toBe('SUPPORT/LOW');
    expect(event?.toValue).toMatch(/^SECURITY\/(HIGH|CRITICAL)$/);
  });
});

async function loginAs(email: string) {
  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'password123',
  });

  expect(response.status).toBe(200);
  return response.body.data.token as string;
}

function authHeader(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function findTicketByTitle(token: string, title: string) {
  const response = await request(app).get('/api/tickets').set(authHeader(token));

  expect(response.status).toBe(200);

  const ticket = response.body.data.find((item: { title: string }) => item.title === title);
  expect(ticket).toBeDefined();

  return ticket as { id: string; title: string };
}

async function createTicket(
  token: string,
  data: {
    title: string;
    description: string;
    category: 'BUG' | 'FEATURE_REQUEST' | 'SUPPORT' | 'SECURITY' | 'PERFORMANCE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  },
) {
  const projectId = await getFirstProjectId(token);
  const response = await request(app)
    .post('/api/tickets')
    .set(authHeader(token))
    .send({
      projectId,
      ...data,
    });

  expect(response.status).toBe(201);
  if (token !== clientToken) expect(response.body.data.triageSuggestion).toBeDefined();

  return response;
}

async function getFirstProjectId(token: string) {
  const response = await request(app).get('/api/projects').set(authHeader(token));

  expect(response.status).toBe(200);
  expect(response.body.data.length).toBeGreaterThan(0);

  return response.body.data[0].id as string;
}
