import { randomBytes } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { requireTestDatabase } from '../src/db/safety';

describe('Production cookies and CSRF at the trusted-proxy boundary', () => {
  let app: Express;
  let untrustedApp: Express;
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const databaseUrl = requireTestDatabase(process.env);
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEPLOYMENT_MODE', 'disposable');
    vi.stubEnv('DATABASE_URL', databaseUrl);
    vi.stubEnv('APP_ORIGIN', 'https://localhost');
    vi.stubEnv('API_ORIGIN', 'https://localhost');
    vi.stubEnv('SESSION_SECRET', randomBytes(32).toString('hex'));
    vi.stubEnv('MAIL_ENCRYPTION_KEY', randomBytes(32).toString('hex'));
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('SMTP_MODE', 'capture');
    vi.stubEnv('SMTP_HOST', 'localhost');
    vi.stubEnv('TRUST_PROXY', '1');
    const { createApp } = await import('../src/app');
    const { pool } = await import('../src/db/client');
    const { sessionStore } = await import('../src/middleware/session');
    close = async () => {
      await sessionStore.close();
      await pool.end();
    };
    app = createApp();
    untrustedApp = createApp();
    untrustedApp.set('trust proxy', 0);
  });

  afterAll(async () => {
    await close?.();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  function expectProductionCookie(value: string) {
    expect(value).toMatch(/^__Host-clientops\.sid=/);
    expect(value).toMatch(/; Path=\//);
    expect(value).toMatch(/; HttpOnly(?:;|$)/);
    expect(value).toMatch(/; Secure(?:;|$)/);
    expect(value).toMatch(/; SameSite=Lax(?:;|$)/);
    expect(value).not.toMatch(/; Domain=/i);
  }

  async function anonymousSession() {
    const response = await request(app)
      .get('/api/auth/csrf')
      .set('X-Forwarded-Proto', 'https')
      .expect(200);
    const cookie = response.get('Set-Cookie')?.[0];
    expect(cookie).toBeDefined();
    expectProductionCookie(cookie!);
    expect(response.get('Cache-Control')).toBe('no-store');
    expect(typeof response.body.data.csrfToken).toBe('string');
    return { cookie: cookie!.split(';')[0]!, token: response.body.data.csrfToken as string };
  }

  it('does not issue a production session cookie on plain HTTP', async () => {
    const response = await request(app).get('/api/auth/csrf').expect(200);
    expect(response.get('Set-Cookie')).toBeUndefined();
  });

  it('does not trust a forwarded HTTPS claim when proxy trust is disabled', async () => {
    const response = await request(untrustedApp)
      .get('/api/auth/csrf')
      .set('X-Forwarded-Proto', 'https')
      .expect(200);
    expect(response.get('Set-Cookie')).toBeUndefined();
  });

  it('issues host-only, HttpOnly, Secure, explicit SameSite cookies through the trusted proxy', async () => {
    await anonymousSession();
  });

  it('rejects missing, forged and cross-session proofs even with production cookies', async () => {
    const first = await anonymousSession();
    const second = await anonymousSession();
    for (const token of [undefined, 'invalid-proof', second.token]) {
      const headers: Record<string, string> = {
        Cookie: first.cookie,
        'X-Forwarded-Proto': 'https',
      };
      if (token) headers['X-CSRF-Token'] = token;
      const response = await request(app).post('/api/auth/logout').set(headers).expect(403);
      expect(response.body.error.code).toBe('CSRF_INVALID');
    }
  });

  it('rejects a foreign origin despite matching session proof', async () => {
    const session = await anonymousSession();
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', session.cookie)
      .set('X-Forwarded-Proto', 'https')
      .set('X-CSRF-Token', session.token)
      .set('Origin', 'https://untrusted.example')
      .expect(403);
    expect(response.body.error.code).toBe('CSRF_INVALID');
  });

  it('accepts matching proof, clears the production cookie and rejects replay', async () => {
    const session = await anonymousSession();
    const headers = {
      Cookie: session.cookie,
      'X-Forwarded-Proto': 'https',
      'X-CSRF-Token': session.token,
      Origin: 'https://localhost',
    };
    const response = await request(app).post('/api/auth/logout').set(headers).expect(200);
    const cleared = response.get('Set-Cookie')?.[0];
    expect(cleared).toBeDefined();
    expectProductionCookie(cleared!);
    expect(cleared).toMatch(/^__Host-clientops\.sid=;/);
    expect(cleared).toContain('Expires=Thu, 01 Jan 1970');
    const replay = await request(app).post('/api/auth/logout').set(headers).expect(403);
    expect(replay.body.error.code).toBe('CSRF_INVALID');
  });
});
