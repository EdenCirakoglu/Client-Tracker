import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { anonymousSession, authHeader, loginSession, type SessionAuth } from './helpers/auth';

const app = createApp();
const id = '00000000-0000-4000-8000-000000000001';
const mutations: readonly ['post' | 'patch', string][] = [
  ['post', '/api/auth/login'],
  ['post', '/api/auth/logout'],
  ['post', '/api/auth/forgot-password'],
  ['post', '/api/auth/accept-invitation'],
  ['post', '/api/auth/reset-password'],
  ['post', '/api/auth/change-password'],
  ['patch', '/api/auth/notification-preferences'],
  ['post', '/api/clients'],
  ['patch', `/api/clients/${id}`],
  ['post', '/api/projects'],
  ['patch', `/api/projects/${id}`],
  ['post', '/api/releases'],
  ['post', '/api/tickets'],
  ['patch', `/api/tickets/${id}`],
  ['post', `/api/tickets/${id}/comments`],
  ['post', `/api/tickets/${id}/triage-suggestion`],
  ['patch', `/api/tickets/${id}/apply-triage-suggestion`],
  ['post', `/api/tickets/${id}/scope`],
  ['post', `/api/tickets/${id}/scope/${id}/decision`],
  ['post', `/api/tickets/${id}/delivery`],
  ['post', `/api/tickets/${id}/delivery/${id}/request-acceptance`],
  ['post', `/api/tickets/${id}/delivery/${id}/decision`],
  ['post', '/api/summaries'],
  ['post', `/api/summaries/${id}/publish`],
  ['post', '/api/users/invitations'],
  ['patch', `/api/users/${id}`],
];

describe('Global CSRF boundary behind cookie sessions (CodeQL alert 1)', () => {
  let admin: SessionAuth;
  let other: SessionAuth;
  beforeAll(async () => {
    await seedDatabase();
    admin = await loginSession(app, 'admin@example.com');
    other = await anonymousSession(app);
  });
  afterAll(() => pool.end());

  it.each(['missing', 'forged', 'cross-session', 'foreign-origin'] as const)(
    'rejects %s proof before every registered mutation handler',
    async (mode) => {
      const headers: Record<string, string> = { Cookie: admin.cookie };
      if (mode !== 'missing')
        headers['X-CSRF-Token'] =
          mode === 'forged'
            ? 'not-a-valid-synchronizer-token'
            : mode === 'cross-session'
              ? other.csrfToken
              : admin.csrfToken;
      if (mode === 'foreign-origin') headers.Origin = 'https://untrusted.example';
      // Empty payloads/unknown IDs would reach validation or lookup without the global guard.
      for (const [method, path] of mutations) {
        const result = await request(app)[method](path).set(headers).send({});
        expect(result.status, `${method} ${path}`).toBe(403);
        expect(result.body.error.code, `${method} ${path}`).toBe('CSRF_INVALID');
      }
      await request(app).get('/api/auth/me').set('Cookie', admin.cookie).expect(200);
    },
  );

  it('does not exempt unsafe methods or accept proof from a query string/body', async () => {
    for (const method of ['put', 'delete', 'patch', 'post'] as const) {
      const result = await request(app)
        [method]('/api/clients')
        .query({ csrfToken: admin.csrfToken })
        .set('Cookie', admin.cookie)
        .send({ csrfToken: admin.csrfToken });
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe('CSRF_INVALID');
    }
  });

  it('permits a real same-origin write with matching proof but retains authorization', async () => {
    const result = await request(app)
      .post('/api/clients')
      .set(authHeader(admin))
      .set('Origin', env.APP_ORIGIN)
      .send({ name: 'CSRF boundary fictional organisation', contactEmail: 'review@csrf.example' })
      .expect(201);
    await request(app)
      .get(`/api/clients/${result.body.data.id}`)
      .set(authHeader(admin))
      .expect(200);
    const client = await loginSession(app, 'client@example.com');
    const forbidden = await request(app)
      .post('/api/clients')
      .set(authHeader(client))
      .send({ name: 'Forbidden organisation', contactEmail: 'denied@csrf.example' })
      .expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });
});
