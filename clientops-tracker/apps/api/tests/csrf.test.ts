import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { anonymousSession, authHeader, loginSession } from './helpers/auth';

const app = createApp();
const id = '11111111-1111-4111-8111-111111111111';
const mutations: { method: 'post' | 'patch'; path: string }[] = [
  ...[
    'login',
    'logout',
    'forgot-password',
    'accept-invitation',
    'reset-password',
    'change-password',
  ].map((action) => ({ method: 'post' as const, path: `/api/auth/${action}` })),
  ...['clients', 'projects', 'tickets'].flatMap((resource) => [
    { method: 'post' as const, path: `/api/${resource}` },
    { method: 'patch' as const, path: `/api/${resource}/${id}` },
  ]),
  { method: 'post', path: '/api/releases' },
  { method: 'post', path: '/api/users/invitations' },
  { method: 'patch', path: `/api/users/${id}` },
  { method: 'post', path: `/api/tickets/${id}/comments` },
  { method: 'post', path: `/api/tickets/${id}/triage-suggestion` },
  { method: 'patch', path: `/api/tickets/${id}/apply-triage-suggestion` },
  { method: 'post', path: `/api/tickets/${id}/delivery` },
  { method: 'post', path: `/api/tickets/${id}/delivery/${id}/request-acceptance` },
  { method: 'post', path: `/api/tickets/${id}/delivery/${id}/decision` },
  { method: 'post', path: `/api/tickets/${id}/scope` },
  { method: 'post', path: `/api/tickets/${id}/scope/${id}/decision` },
  { method: 'post', path: '/api/summaries' },
  { method: 'post', path: `/api/summaries/${id}/publish` },
];

describe('Global synchronizer CSRF protection', () => {
  let admin: Awaited<ReturnType<typeof loginSession>>;
  let unrelated: Awaited<ReturnType<typeof anonymousSession>>;

  beforeAll(async () => {
    await seedDatabase();
    admin = await loginSession(app, 'admin@example.com');
    unrelated = await anonymousSession(app);
  });
  afterAll(() => pool.end());

  it.each(mutations)(
    'rejects forged $method $path before route execution',
    async ({ method, path }) => {
      // Missing Origin does not bypass tokens; a valid token does not bypass Origin checks.
      const forgedHeaders = [
        { Cookie: admin.cookie },
        { ...authHeader(admin), 'X-CSRF-Token': 'invalid' },
        { ...authHeader(admin), 'X-CSRF-Token': unrelated.csrfToken },
        { ...authHeader(admin), Origin: 'https://attacker.example' },
      ];
      for (const headers of forgedHeaders) {
        const response = await request(app)[method](path).set(headers).send({}).expect(403);
        expect(response.body.error.code).toBe('CSRF_INVALID');
      }
    },
  );

  it('permits a valid same-session token to reach request validation', async () => {
    const response = await request(app)
      .post('/api/clients')
      .set(authHeader(admin))
      .send({})
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
