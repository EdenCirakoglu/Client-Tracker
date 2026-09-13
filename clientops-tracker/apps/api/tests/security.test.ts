import { randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import {
  accountTokens,
  authRateLimits,
  authSessions,
  bootstrapState,
  clients,
  users,
  webSessions,
} from '../src/db/schema';
import { env } from '../src/config/env';
import { hashToken } from '../src/middleware/session';
import { bootstrapAdministrator } from '../src/services/account.service';
import { anonymousSession, authHeader, loginResponse, loginSession } from './helpers/auth';

const app = createApp();
const password = 'Fictional-test-passphrase-42';
const mailUrl = process.env.MAILPIT_URL ?? 'http://localhost:18025';

async function mailToken(email: string, reset = false) {
  let token = '';
  await expect
    .poll(
      async () => {
        const inbox = (await (await fetch(`${mailUrl}/api/v1/messages`)).json()) as {
          messages: { ID: string; Subject: string; To: { Address: string }[] }[];
        };
        const message = inbox.messages.find(
          (item) =>
            item.To.some((recipient) => recipient.Address === email) &&
            item.Subject.includes(reset ? 'Reset' : 'invitation'),
        );
        if (!message) return false;
        const content = (await (await fetch(`${mailUrl}/api/v1/message/${message.ID}`)).json()) as {
          Text: string;
        };
        token = content.Text.match(/#token=([a-f0-9]{64})/)?.[1] ?? '';
        return !!token;
      },
      { timeout: 10000 },
    )
    .toBe(true);
  return token;
}
async function activeAccount(label: string) {
  const admin = await loginSession(app, 'admin@example.com');
  const email = `${label}@accounts.example`;
  const invitation = await request(app)
    .post('/api/users/invitations')
    .set(authHeader(admin))
    .send({ name: 'Fictional teammate', email, role: 'DEVELOPER', clientId: null })
    .expect(201);
  const token = await mailToken(email);
  const anonymous = await anonymousSession(app);
  await request(app)
    .post('/api/auth/accept-invitation')
    .set(authHeader(anonymous))
    .send({ token, password })
    .expect(200);
  return {
    id: invitation.body.data.id as string,
    email,
    session: await loginSession(app, email, password),
    token,
  };
}

describe('Server sessions and account lifecycle', () => {
  beforeAll(async () => {
    await seedDatabase();
    await fetch(`${mailUrl}/api/v1/messages`, { method: 'DELETE' });
  });
  afterAll(() => pool.end());

  it('bootstrap refuses existing administrators, serializes concurrent creation and remains locked', async () => {
    const input = { name: 'Bootstrap operator', email: 'bootstrap@accounts.example', password };
    await expect(bootstrapAdministrator(input)).rejects.toMatchObject({
      code: 'BOOTSTRAP_COMPLETE',
    });
    // Only the explicitly disposable test database is modified to exercise the empty-admin path.
    await db.update(users).set({ role: 'DEVELOPER' }).where(eq(users.role, 'ADMIN'));
    await db.delete(bootstrapState);
    const attempts = await Promise.allSettled([
      bootstrapAdministrator(input),
      bootstrapAdministrator({ ...input, email: 'second@accounts.example' }),
    ]);
    expect(attempts.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(await db.select().from(users).where(eq(users.role, 'ADMIN'))).toHaveLength(1);
    await db.update(users).set({ role: 'DEVELOPER' }).where(eq(users.role, 'ADMIN'));
    await expect(
      bootstrapAdministrator({ ...input, email: 'third@accounts.example' }),
    ).rejects.toMatchObject({ code: 'BOOTSTRAP_COMPLETE' });
    await seedDatabase();
  });

  it('rotates anonymous SID/CSRF at login, uses HttpOnly Lax cookies and rejects bearer authentication', async () => {
    const anonymous = await anonymousSession(app);
    const response = await request(app)
      .post('/api/auth/login')
      .set(authHeader(anonymous))
      .send({ email: 'admin@example.com', password: 'password123' })
      .expect(200);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.headers['set-cookie']?.[0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie']?.[0]).not.toContain(anonymous.cookie);
    expect(response.body.data.csrfToken).not.toBe(anonymous.csrfToken);
    expect(response.body.data).not.toHaveProperty('token');
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer old-jwt').expect(401);
    await request(app).get('/api/auth/me').set(authHeader(anonymous)).expect(401);
  });

  it('rejects missing, cross-session and cross-origin CSRF on login and authenticated writes', async () => {
    const session = await loginSession(app, 'developer@example.com');
    const other = await anonymousSession(app);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' })
      .expect(403);
    await request(app).post('/api/auth/logout').set('Cookie', session.cookie).expect(403);
    await request(app)
      .post('/api/auth/logout')
      .set({ ...authHeader(session), 'X-CSRF-Token': other.csrfToken })
      .expect(403);
    await request(app)
      .post('/api/auth/logout')
      .set(authHeader(session))
      .set('Origin', 'https://attacker.example')
      .expect(403);
    await request(app).get('/api/auth/me').set(authHeader(session)).expect(200);
  });

  it.each(['idleExpiresAt', 'absoluteExpiresAt'] as const)(
    'enforces server-side %s despite an unexpired cookie',
    async (field) => {
      const session = await loginSession(app, 'developer@example.com');
      const me = await request(app).get('/api/auth/me').set(authHeader(session));
      await db
        .update(authSessions)
        .set({ [field]: new Date(Date.now() - 1000) })
        .where(eq(authSessions.userId, me.body.data.id));
      const response = await request(app).get('/api/auth/me').set(authHeader(session)).expect(401);
      expect(response.body.error.code).toBe('SESSION_EXPIRED');
    },
  );

  it('revokes logout replay even if a late store write resurrects session JSON', async () => {
    const session = await loginSession(app, 'client@example.com');
    const rows = await db.select().from(webSessions);
    const stored = rows.find((row) => session.cookie.includes(encodeURIComponent(row.sid)));
    expect(stored).toBeDefined();
    await request(app).post('/api/auth/logout').set(authHeader(session)).expect(200);
    if (!stored) throw new Error('Missing stored session');
    await db
      .insert(webSessions)
      .values(stored)
      .onConflictDoUpdate({ target: webSessions.sid, set: { sess: stored.sess } });
    await request(app).get('/api/auth/me').set(authHeader(session)).expect(401);
  });

  it('limits login attempts with persistent rate buckets', async () => {
    const anonymous = await anonymousSession(app);
    let response;
    for (let index = 0; index < 21; index++)
      response = await request(app)
        .post('/api/auth/login')
        .set(authHeader(anonymous))
        .send({ email: 'missing@accounts.example', password: 'wrong' });
    expect(response?.status).toBe(429);
    expect(response?.headers['retry-after']).toBeTruthy();
    expect((await db.select().from(authRateLimits)).length).toBeGreaterThan(0);
    await db.delete(authRateLimits);
  }, 20000);

  it('restricts invitations and server-enforces organisation assignment', async () => {
    const developer = await loginSession(app, 'developer@example.com');
    await request(app)
      .post('/api/users/invitations')
      .set(authHeader(developer))
      .send({})
      .expect(403);
    await request(app)
      .get('/api/users')
      .set(authHeader(await loginSession(app, 'client@example.com')))
      .expect(403);
    const admin = await loginSession(app, 'admin@example.com');
    for (const input of [
      { role: 'CLIENT', clientId: null },
      { role: 'DEVELOPER', clientId: randomBytes(16).toString('hex') },
    ]) {
      await request(app)
        .post('/api/users/invitations')
        .set(authHeader(admin))
        .send({ name: 'Invalid assignment', email: 'invalid@accounts.example', ...input })
        .expect(400);
    }
  });

  it('stores only hashed invitation tokens, consumes concurrently once, and forbids role injection', async () => {
    const admin = await loginSession(app, 'admin@example.com');
    const email = 'concurrent-invite@accounts.example';
    const invite = await request(app)
      .post('/api/users/invitations')
      .set(authHeader(admin))
      .send({ name: 'Invited developer', email, role: 'DEVELOPER', clientId: null })
      .expect(201);
    const token = await mailToken(email);
    const [stored] = await db
      .select()
      .from(accountTokens)
      .where(eq(accountTokens.userId, invite.body.data.id));
    expect(stored?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    const anonymous = await anonymousSession(app);
    await request(app)
      .post('/api/auth/accept-invitation')
      .set(authHeader(anonymous))
      .send({ token, password, role: 'ADMIN' })
      .expect(400);
    const responses = await Promise.all(
      [1, 2, 3].map(() =>
        request(app)
          .post('/api/auth/accept-invitation')
          .set(authHeader(anonymous))
          .send({ token, password }),
      ),
    );
    expect(responses.map((res) => res.status).sort()).toEqual([200, 400, 400]);
    expect((await loginResponse(app, email, password)).body.data.user.role).toBe('DEVELOPER');
  });

  it('returns identical recovery responses and rejects expired or reused reset links', async () => {
    const account = await activeAccount('expired-reset');
    const anonymous = await anonymousSession(app);
    const known = await request(app)
      .post('/api/auth/forgot-password')
      .set(authHeader(anonymous))
      .send({ email: account.email })
      .expect(202);
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .set(authHeader(anonymous))
      .send({ email: 'unknown@accounts.example' })
      .expect(202);
    expect(known.body).toEqual(unknown.body);
    const token = await mailToken(account.email, true);
    await db
      .update(accountTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(accountTokens.tokenHash, hashToken(token)));
    await request(app)
      .post('/api/auth/reset-password')
      .set(authHeader(anonymous))
      .send({ token, password })
      .expect(400);
    await request(app)
      .post('/api/auth/accept-invitation')
      .set(authHeader(anonymous))
      .send({ token: account.token, password })
      .expect(400);
  });

  it('atomically resets once and revokes all sessions, including concurrent reset attempts', async () => {
    const account = await activeAccount('reset-revocation');
    const secondSession = await loginSession(app, account.email, password);
    const anonymous = await anonymousSession(app);
    await request(app)
      .post('/api/auth/forgot-password')
      .set(authHeader(anonymous))
      .send({ email: account.email })
      .expect(202);
    const token = await mailToken(account.email, true);
    const outcomes = await Promise.all(
      [1, 2, 3].map(() =>
        request(app)
          .post('/api/auth/reset-password')
          .set(authHeader(anonymous))
          .send({ token, password: `${password}-new` }),
      ),
    );
    expect(outcomes.map((res) => res.status).sort()).toEqual([200, 400, 400]);
    for (const session of [account.session, secondSession])
      await request(app).get('/api/auth/me').set(authHeader(session)).expect(401);
    expect((await loginResponse(app, account.email, password)).status).toBe(401);
    expect((await loginResponse(app, account.email, `${password}-new`)).status).toBe(200);
  });

  it('password change revokes other sessions and requires the existing password', async () => {
    const account = await activeAccount('password-change');
    const second = await loginSession(app, account.email, password);
    await request(app)
      .post('/api/auth/change-password')
      .set(authHeader(account.session))
      .send({ currentPassword: 'wrong', password })
      .expect(400);
    await request(app)
      .post('/api/auth/change-password')
      .set(authHeader(account.session))
      .send({ currentPassword: password, password: `${password}-next` })
      .expect(200);
    await request(app).get('/api/auth/me').set(authHeader(second)).expect(401);
    await request(app).get('/api/auth/me').set(authHeader(account.session)).expect(401);
  });

  it('disablement and role/organisation changes revoke sessions and scope the next login', async () => {
    const account = await activeAccount('membership');
    const admin = await loginSession(app, 'admin@example.com');
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.contactEmail, 'support@bluewave.example'));
    if (!client) throw new Error('Missing organisation');
    await request(app)
      .patch(`/api/users/${account.id}`)
      .set(authHeader(admin))
      .send({ role: 'CLIENT', clientId: client.id, disabled: false })
      .expect(200);
    await request(app).get('/api/auth/me').set(authHeader(account.session)).expect(401);
    const changed = await loginSession(app, account.email, password);
    const projects = await request(app).get('/api/projects').set(authHeader(changed)).expect(200);
    expect(
      projects.body.data.every((project: { clientId: string }) => project.clientId === client.id),
    ).toBe(true);
    await request(app).get('/api/users').set(authHeader(changed)).expect(403);
    await request(app)
      .patch(`/api/users/${account.id}`)
      .set(authHeader(admin))
      .send({ role: 'CLIENT', clientId: client.id, disabled: true })
      .expect(200);
    await request(app).get('/api/auth/me').set(authHeader(changed)).expect(401);
    expect((await loginResponse(app, account.email, password)).status).toBe(401);
    const me = await request(app).get('/api/auth/me').set(authHeader(admin));
    await request(app)
      .patch(`/api/users/${me.body.data.id}`)
      .set(authHeader(admin))
      .send({ role: 'ADMIN', clientId: null, disabled: true })
      .expect(400);
  });

  it('reloads current organisation and role even for direct database membership changes', async () => {
    const session = await loginSession(app, 'client@example.com');
    const [other] = await db
      .select()
      .from(clients)
      .where(eq(clients.contactEmail, 'support@bluewave.example'));
    await db
      .update(users)
      .set({ clientId: other!.id })
      .where(eq(users.email, 'client@example.com'));
    const me = await request(app).get('/api/auth/me').set(authHeader(session)).expect(200);
    expect(me.body.data.clientId).toBe(other!.id);
    await db
      .update(users)
      .set({ role: 'CLIENT', clientId: other!.id })
      .where(eq(users.email, 'developer@example.com'));
    const developer = await loginSession(app, 'developer@example.com');
    await request(app)
      .post('/api/users/invitations')
      .set(authHeader(developer))
      .send({})
      .expect(403);
  });

  it('rejects demo accounts when demo mode is disabled and never overwrites existing identities', async () => {
    const previous = env.DEMO_MODE;
    try {
      env.DEMO_MODE = false;
      expect((await loginResponse(app, 'admin@example.com')).status).toBe(401);
    } finally {
      env.DEMO_MODE = previous;
    }
    const admin = await loginSession(app, 'admin@example.com');
    await request(app)
      .post('/api/users/invitations')
      .set(authHeader(admin))
      .send({
        name: 'Overwrite attempt',
        email: 'admin@example.com',
        role: 'CLIENT',
        clientId: null,
      })
      .expect(400);
    await request(app)
      .post('/api/users/invitations')
      .set(authHeader(admin))
      .send({
        name: 'Overwrite attempt',
        email: 'admin@example.com',
        role: 'DEVELOPER',
        clientId: null,
      })
      .expect(409);
    const [unchanged] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, 'admin@example.com'), sql`${users.role} = 'ADMIN'`));
    expect(unchanged?.name).toBe('Demo Administrator');
  });
});
